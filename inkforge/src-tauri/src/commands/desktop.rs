//! Desktop runtime commands.

use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::{Component, Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::api::dialog::blocking::FileDialogBuilder;
use tauri::AppHandle;

use super::window::{list_open_windows, DesktopWindowInfo};

#[derive(Debug, Serialize)]
pub struct DesktopRuntimeInfo {
    #[serde(rename = "productName")]
    product_name: String,
    version: String,
    #[serde(rename = "targetOs")]
    target_os: String,
    #[serde(rename = "appDataDir")]
    app_data_dir: Option<String>,
    windows: Vec<DesktopWindowInfo>,
}

const MAX_BUNDLE_FILES: usize = 512;
const MAX_BUNDLE_BYTES: usize = 128 * 1024 * 1024;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalDeliveryFileInput {
    relative_path: String,
    content: Option<String>,
    base64: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalDeliveryWriteInput {
    picker_title: Option<String>,
    files: Vec<LocalDeliveryFileInput>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalDeliveryWrittenFile {
    relative_path: String,
    absolute_path: String,
    bytes: usize,
    readback_verified: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalDeliveryWriteResult {
    root_path: String,
    files: Vec<LocalDeliveryWrittenFile>,
    cleanup_warning: Option<String>,
}

#[derive(Debug)]
struct PreparedLocalDeliveryFile {
    relative_path: PathBuf,
    bytes: Vec<u8>,
}

#[tauri::command]
pub async fn get_desktop_runtime_info(app: AppHandle) -> Result<DesktopRuntimeInfo, String> {
    let package_info = app.package_info();
    let app_data_dir = app
        .path_resolver()
        .app_data_dir()
        .map(|path| path.to_string_lossy().to_string());
    let windows = list_open_windows(app.clone()).await?;

    Ok(DesktopRuntimeInfo {
        product_name: package_info.name.clone(),
        version: package_info.version.to_string(),
        target_os: std::env::consts::OS.to_string(),
        app_data_dir,
        windows,
    })
}

fn validate_portable_segment(segment: &str) -> Result<(), String> {
    if segment.is_empty()
        || segment.ends_with([' ', '.'])
        || segment.chars().any(|character| {
            character.is_control()
                || matches!(
                    character,
                    '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*'
                )
        })
    {
        return Err(format!(
            "relative path contains an invalid segment: {segment}"
        ));
    }

    let stem = segment
        .split('.')
        .next()
        .unwrap_or_default()
        .to_ascii_lowercase();
    let reserved = matches!(stem.as_str(), "con" | "prn" | "aux" | "nul")
        || stem.strip_prefix("com").is_some_and(|suffix| {
            matches!(suffix, "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9")
        })
        || stem.strip_prefix("lpt").is_some_and(|suffix| {
            matches!(suffix, "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9")
        });
    if reserved {
        return Err(format!(
            "relative path uses a reserved file name: {segment}"
        ));
    }

    Ok(())
}

fn validate_relative_path(value: &str) -> Result<PathBuf, String> {
    if value.is_empty() || value.trim() != value {
        return Err(
            "relativePath must be non-empty and have no surrounding whitespace".to_string(),
        );
    }

    let path = Path::new(value);
    if path.is_absolute() {
        return Err(format!("relativePath must not be absolute: {value}"));
    }

    let mut normalized = PathBuf::new();
    for component in path.components() {
        match component {
            Component::Normal(segment) => {
                let segment = segment.to_string_lossy();
                validate_portable_segment(&segment)?;
                normalized.push(segment.as_ref());
            }
            Component::CurDir
            | Component::ParentDir
            | Component::RootDir
            | Component::Prefix(_) => {
                return Err(format!(
                    "relativePath contains a disallowed component: {value}"
                ));
            }
        }
    }

    if normalized.as_os_str().is_empty() {
        return Err("relativePath must contain a file name".to_string());
    }
    if normalized.components().next().is_some_and(|component| {
        component
            .as_os_str()
            .to_string_lossy()
            .starts_with(".inkforge-stage-")
    }) {
        return Err("relativePath collides with InkForge transaction storage".to_string());
    }

    Ok(normalized)
}

fn path_identity(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/").to_lowercase()
}

fn prepare_local_delivery_files(
    files: Vec<LocalDeliveryFileInput>,
) -> Result<Vec<PreparedLocalDeliveryFile>, String> {
    if files.is_empty() {
        return Err("at least one file is required".to_string());
    }
    if files.len() > MAX_BUNDLE_FILES {
        return Err(format!("bundle exceeds the {MAX_BUNDLE_FILES}-file limit"));
    }

    let mut prepared = Vec::with_capacity(files.len());
    let mut identities = HashSet::with_capacity(files.len());
    let mut total_bytes = 0usize;

    for file in files {
        let relative_path = validate_relative_path(&file.relative_path)?;
        if !identities.insert(path_identity(&relative_path)) {
            return Err(format!("duplicate relativePath: {}", file.relative_path));
        }

        let bytes = match (file.content, file.base64) {
            (Some(content), None) => content.into_bytes(),
            (None, Some(base64)) => BASE64_STANDARD
                .decode(base64)
                .map_err(|error| format!("invalid Base64 for {}: {error}", file.relative_path))?,
            _ => {
                return Err(format!(
                    "exactly one of content or base64 is required for {}",
                    file.relative_path
                ));
            }
        };

        total_bytes = total_bytes
            .checked_add(bytes.len())
            .ok_or_else(|| "bundle byte count overflow".to_string())?;
        if total_bytes > MAX_BUNDLE_BYTES {
            return Err(format!("bundle exceeds the {MAX_BUNDLE_BYTES}-byte limit"));
        }

        prepared.push(PreparedLocalDeliveryFile {
            relative_path,
            bytes,
        });
    }

    // ponytail: O(n²) is bounded by MAX_BUNDLE_FILES; use a path trie only if that cap grows.
    for (index, candidate) in prepared.iter().enumerate() {
        for other in prepared.iter().skip(index + 1) {
            if candidate.relative_path.starts_with(&other.relative_path)
                || other.relative_path.starts_with(&candidate.relative_path)
            {
                return Err(format!(
                    "bundle paths conflict as file and parent: {} / {}",
                    candidate.relative_path.display(),
                    other.relative_path.display()
                ));
            }
        }
    }

    Ok(prepared)
}

fn validate_existing_target(root: &Path, relative_path: &Path) -> Result<(), String> {
    let component_count = relative_path.components().count();
    let mut current = root.to_path_buf();
    for (index, component) in relative_path.components().enumerate() {
        current.push(component.as_os_str());
        let metadata = match fs::symlink_metadata(&current) {
            Ok(metadata) => metadata,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
            Err(error) => return Err(format!("cannot inspect {}: {error}", current.display())),
        };
        if metadata.file_type().is_symlink() {
            return Err(format!(
                "symbolic links are not allowed in destination paths: {}",
                current.display()
            ));
        }
        if index + 1 == component_count {
            return Err(format!(
                "destination target already exists: {}",
                current.display()
            ));
        }
        if !metadata.is_dir() {
            return Err(format!(
                "destination parent is not a directory: {}",
                current.display()
            ));
        }
    }
    Ok(())
}

fn create_transaction_dir(root: &Path) -> Result<PathBuf, String> {
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_nanos();
    for attempt in 0..16u8 {
        let candidate = root.join(format!(
            ".inkforge-stage-{}-{stamp}-{attempt}",
            std::process::id()
        ));
        match fs::create_dir(&candidate) {
            Ok(()) => return Ok(candidate),
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(error) => return Err(format!("cannot create staging directory: {error}")),
        }
    }
    Err("cannot allocate a unique staging directory".to_string())
}

fn write_staged_files(
    transaction_dir: &Path,
    files: &[PreparedLocalDeliveryFile],
) -> Result<(), String> {
    let staged_root = transaction_dir.join("files");
    for file in files {
        let staged_path = staged_root.join(&file.relative_path);
        let parent = staged_path
            .parent()
            .ok_or_else(|| format!("staged file has no parent: {}", staged_path.display()))?;
        fs::create_dir_all(parent).map_err(|error| {
            format!("cannot create staging parent {}: {error}", parent.display())
        })?;
        let mut output = File::create(&staged_path).map_err(|error| {
            format!(
                "cannot create staged file {}: {error}",
                staged_path.display()
            )
        })?;
        output.write_all(&file.bytes).map_err(|error| {
            format!(
                "cannot write staged file {}: {error}",
                staged_path.display()
            )
        })?;
        output.sync_all().map_err(|error| {
            format!(
                "cannot flush staged file {}: {error}",
                staged_path.display()
            )
        })?;
    }
    Ok(())
}

fn ensure_target_parents(
    root: &Path,
    relative_parent: &Path,
    created_dirs: &mut Vec<PathBuf>,
) -> Result<(), String> {
    let mut current = root.to_path_buf();
    for component in relative_parent.components() {
        current.push(component.as_os_str());
        match fs::symlink_metadata(&current) {
            Ok(metadata) if metadata.file_type().is_symlink() => {
                return Err(format!(
                    "symbolic links are not allowed in destination paths: {}",
                    current.display()
                ));
            }
            Ok(metadata) if metadata.is_dir() => {}
            Ok(_) => {
                return Err(format!(
                    "destination parent is not a directory: {}",
                    current.display()
                ))
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                fs::create_dir(&current).map_err(|error| {
                    format!(
                        "cannot create destination directory {}: {error}",
                        current.display()
                    )
                })?;
                created_dirs.push(current.clone());
            }
            Err(error) => {
                return Err(format!(
                    "cannot inspect destination directory {}: {error}",
                    current.display()
                ))
            }
        }
    }
    Ok(())
}

fn rollback_local_delivery(installed: &[PathBuf], created_dirs: &[PathBuf]) -> Vec<String> {
    let mut errors = Vec::new();
    for target in installed.iter().rev() {
        if let Err(error) = fs::remove_file(target) {
            if error.kind() != std::io::ErrorKind::NotFound {
                errors.push(format!(
                    "cannot remove partial file {}: {error}",
                    target.display()
                ));
            }
        }
    }
    for directory in created_dirs.iter().rev() {
        if let Err(error) = fs::remove_dir(directory) {
            if !matches!(
                error.kind(),
                std::io::ErrorKind::NotFound | std::io::ErrorKind::DirectoryNotEmpty
            ) {
                errors.push(format!(
                    "cannot remove partial directory {}: {error}",
                    directory.display()
                ));
            }
        }
    }
    errors
}

fn copy_staged_file_no_clobber(staged: &Path, target: &Path) -> Result<(), String> {
    let mut source = File::open(staged)
        .map_err(|error| format!("cannot open staged file {}: {error}", staged.display()))?;
    let mut destination = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(target)
        .map_err(|error| {
            if error.kind() == std::io::ErrorKind::AlreadyExists {
                format!("destination target already exists: {}", target.display())
            } else {
                format!(
                    "cannot create destination target {}: {error}",
                    target.display()
                )
            }
        })?;

    let result = (|| {
        std::io::copy(&mut source, &mut destination)
            .map_err(|error| format!("cannot copy staged file to {}: {error}", target.display()))?;
        destination
            .flush()
            .map_err(|error| format!("cannot flush {}: {error}", target.display()))?;
        destination
            .sync_all()
            .map_err(|error| format!("cannot sync {}: {error}", target.display()))
    })();

    if let Err(error) = result {
        drop(destination);
        let _ = fs::remove_file(target);
        return Err(error);
    }
    Ok(())
}

fn install_staged_file_no_clobber(staged: &Path, target: &Path) -> Result<(), String> {
    match fs::hard_link(staged, target) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {
            Err(format!("destination target already exists: {}", target.display()))
        }
        Err(hard_link_error) => copy_staged_file_no_clobber(staged, target).map_err(|copy_error| {
            format!(
                "cannot install {}: hard link failed: {hard_link_error}; copy fallback failed: {copy_error}",
                target.display()
            )
        }),
    }
}

fn commit_staged_bundle(
    root: &Path,
    transaction_dir: &Path,
    files: &[PreparedLocalDeliveryFile],
) -> Result<Vec<LocalDeliveryWrittenFile>, String> {
    let staged_root = transaction_dir.join("files");
    let mut installed = Vec::new();
    let mut created_dirs = Vec::new();

    let commit_result = (|| {
        for file in files {
            let target = root.join(&file.relative_path);
            let relative_parent = file.relative_path.parent().unwrap_or_else(|| Path::new(""));
            ensure_target_parents(root, relative_parent, &mut created_dirs)?;
            validate_existing_target(root, &file.relative_path)?;

            let staged = staged_root.join(&file.relative_path);
            install_staged_file_no_clobber(&staged, &target)?;
            installed.push(target);
        }

        let mut written = Vec::with_capacity(files.len());
        for file in files {
            let target = root.join(&file.relative_path);
            let readback = fs::read(&target)
                .map_err(|error| format!("cannot read back {}: {error}", target.display()))?;
            if readback != file.bytes {
                return Err(format!("readback mismatch for {}", target.display()));
            }
            written.push(LocalDeliveryWrittenFile {
                relative_path: file.relative_path.to_string_lossy().replace('\\', "/"),
                absolute_path: target.to_string_lossy().to_string(),
                bytes: readback.len(),
                readback_verified: true,
            });
        }
        Ok(written)
    })();

    match commit_result {
        Ok(written) => Ok(written),
        Err(error) => {
            let rollback_errors = rollback_local_delivery(&installed, &created_dirs);
            let _ = fs::remove_dir_all(transaction_dir);
            if rollback_errors.is_empty() {
                Err(format!(
                    "local bundle commit failed; previous destination restored: {error}"
                ))
            } else {
                Err(format!(
                    "local bundle commit failed: {error}; rollback errors: {}",
                    rollback_errors.join(" | ")
                ))
            }
        }
    }
}

fn write_local_delivery_bundle_sync(
    destination_root: &Path,
    input_files: Vec<LocalDeliveryFileInput>,
) -> Result<LocalDeliveryWriteResult, String> {
    let root = fs::canonicalize(destination_root)
        .map_err(|error| format!("cannot resolve destinationRoot: {error}"))?;
    if !root.is_dir() {
        return Err(format!(
            "destinationRoot is not a directory: {}",
            root.display()
        ));
    }

    let files = prepare_local_delivery_files(input_files)?;
    for file in &files {
        validate_existing_target(&root, &file.relative_path)?;
    }

    let transaction_dir = create_transaction_dir(&root)?;
    if let Err(error) = write_staged_files(&transaction_dir, &files) {
        let _ = fs::remove_dir_all(&transaction_dir);
        return Err(error);
    }

    let written = commit_staged_bundle(&root, &transaction_dir, &files)?;
    let cleanup_warning = fs::remove_dir_all(&transaction_dir)
        .err()
        .map(|error| format!("written files are valid, but staging cleanup failed: {error}"));

    Ok(LocalDeliveryWriteResult {
        root_path: root.to_string_lossy().to_string(),
        files: written,
        cleanup_warning,
    })
}

#[tauri::command]
pub async fn write_local_delivery_bundle(
    input: LocalDeliveryWriteInput,
) -> Result<Option<LocalDeliveryWriteResult>, String> {
    let picker_title = input
        .picker_title
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("选择导出目录")
        .to_string();
    tokio::task::spawn_blocking(move || {
        let Some(destination_root) = FileDialogBuilder::new()
            .set_title(&picker_title)
            .pick_folder()
        else {
            return Ok(None);
        };
        write_local_delivery_bundle_sync(&destination_root, input.files).map(Some)
    })
    .await
    .map_err(|error| format!("local bundle worker failed: {error}"))?
}

#[tauri::command]
pub async fn reveal_in_explorer(path: String) -> Result<(), String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("path is required".to_string());
    }

    let target = PathBuf::from(trimmed);
    if !target.exists() {
        return Err(format!("path does not exist: {}", target.display()));
    }

    reveal_path(target)
}

#[cfg(target_os = "windows")]
fn reveal_path(path: PathBuf) -> Result<(), String> {
    let argument = if path.is_file() {
        format!("/select,{}", path.display())
    } else {
        path.to_string_lossy().to_string()
    };

    Command::new("explorer")
        .arg(argument)
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_root(label: &str) -> PathBuf {
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock")
            .as_nanos();
        let root =
            std::env::temp_dir().join(format!("inkforge-{label}-{}-{stamp}", std::process::id()));
        fs::create_dir_all(&root).expect("create test root");
        root
    }

    fn text_file(relative_path: &str, content: &str) -> LocalDeliveryFileInput {
        LocalDeliveryFileInput {
            relative_path: relative_path.to_string(),
            content: Some(content.to_string()),
            base64: None,
        }
    }

    #[test]
    fn writes_text_and_binary_files_with_exact_readback() {
        let root = test_root("local-delivery-success");

        let result = write_local_delivery_bundle_sync(
            &root,
            vec![
                text_file("article.md", "# New\n"),
                LocalDeliveryFileInput {
                    relative_path: "article.assets/image.bin".to_string(),
                    content: None,
                    base64: Some("AAECAw==".to_string()),
                },
            ],
        )
        .expect("write bundle");

        assert_eq!(
            fs::read_to_string(root.join("article.md")).expect("read text"),
            "# New\n"
        );
        assert_eq!(
            fs::read(root.join("article.assets/image.bin")).expect("read binary"),
            vec![0, 1, 2, 3]
        );
        assert_eq!(result.files.len(), 2);
        assert!(result.files.iter().all(|file| file.readback_verified));
        assert!(result.cleanup_warning.is_none());
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn rejects_existing_targets_without_touching_destination() {
        let root = test_root("local-delivery-existing-target");
        fs::write(root.join("article.md"), "original").expect("seed old file");

        let error = write_local_delivery_bundle_sync(
            &root,
            vec![
                text_file("article.md", "replacement"),
                text_file("new.md", "new"),
            ],
        )
        .expect_err("reject existing target");

        assert!(error.contains("destination target already exists"));
        assert_eq!(
            fs::read_to_string(root.join("article.md")).expect("read old file"),
            "original"
        );
        assert!(!root.join("new.md").exists());
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn rejects_unsafe_or_conflicting_paths_before_touching_destination() {
        let root = test_root("local-delivery-validation");
        fs::write(root.join("article.md"), "original").expect("seed old file");

        let traversal =
            write_local_delivery_bundle_sync(&root, vec![text_file("../escape.md", "bad")]);
        assert!(traversal
            .expect_err("reject traversal")
            .contains("disallowed component"));

        let conflict = write_local_delivery_bundle_sync(
            &root,
            vec![
                text_file("nested", "file"),
                text_file("nested/child.md", "child"),
            ],
        );
        assert!(conflict
            .expect_err("reject conflict")
            .contains("file and parent"));
        assert_eq!(
            fs::read_to_string(root.join("article.md")).expect("read old file"),
            "original"
        );
        assert!(!root.parent().expect("parent").join("escape.md").exists());
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn removes_partial_install_after_commit_failure() {
        let root = test_root("local-delivery-rollback");
        let transaction = create_transaction_dir(&root).expect("transaction");
        let staged_root = transaction.join("files");
        fs::create_dir_all(&staged_root).expect("staged root");
        fs::write(staged_root.join("first.md"), "replacement").expect("stage first");

        let files = vec![
            PreparedLocalDeliveryFile {
                relative_path: PathBuf::from("first.md"),
                bytes: b"replacement".to_vec(),
            },
            PreparedLocalDeliveryFile {
                relative_path: PathBuf::from("missing.md"),
                bytes: b"missing".to_vec(),
            },
        ];

        let error =
            commit_staged_bundle(&root, &transaction, &files).expect_err("commit must fail");
        assert!(error.contains("previous destination restored"));
        assert!(!root.join("first.md").exists());
        assert!(!root.join("missing.md").exists());
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn rejects_target_created_after_staging_without_overwriting_it() {
        let root = test_root("local-delivery-race");
        let transaction = create_transaction_dir(&root).expect("transaction");
        let staged_root = transaction.join("files");
        fs::create_dir_all(&staged_root).expect("staged root");
        fs::write(staged_root.join("article.md"), "replacement").expect("stage replacement");
        fs::write(root.join("article.md"), "original").expect("create competing target");

        let error = commit_staged_bundle(
            &root,
            &transaction,
            &[PreparedLocalDeliveryFile {
                relative_path: PathBuf::from("article.md"),
                bytes: b"replacement".to_vec(),
            }],
        )
        .expect_err("reject competing target");

        assert!(error.contains("destination target already exists"));
        assert_eq!(
            fs::read_to_string(root.join("article.md")).expect("read competing target"),
            "original"
        );
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn copy_fallback_preserves_no_clobber_and_exact_bytes() {
        let root = test_root("local-delivery-copy-fallback");
        let staged = root.join("staged.bin");
        let target = root.join("target.bin");
        fs::write(&staged, [0_u8, 1, 2, 3]).expect("write staged file");

        copy_staged_file_no_clobber(&staged, &target).expect("copy staged file");
        assert_eq!(fs::read(&target).expect("read target"), [0_u8, 1, 2, 3]);

        fs::write(&staged, [9_u8]).expect("replace staged file");
        let error = copy_staged_file_no_clobber(&staged, &target)
            .expect_err("existing target must not be overwritten");
        assert!(error.contains("destination target already exists"));
        assert_eq!(fs::read(&target).expect("read target"), [0_u8, 1, 2, 3]);
        fs::remove_dir_all(root).expect("cleanup");
    }
}

#[cfg(target_os = "macos")]
fn reveal_path(path: PathBuf) -> Result<(), String> {
    Command::new("open")
        .arg("-R")
        .arg(path)
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[cfg(target_os = "linux")]
fn reveal_path(path: PathBuf) -> Result<(), String> {
    let directory = if path.is_dir() {
        path
    } else {
        path.parent()
            .map(PathBuf::from)
            .ok_or_else(|| "path has no parent directory".to_string())?
    };

    Command::new("xdg-open")
        .arg(directory)
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}
