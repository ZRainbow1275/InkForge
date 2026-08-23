from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Iterable


PRESERVATION_REFS = {
    "refs/preserve/engineering-audit/wip-2026-05-07": "59feabcd3c6538bb984d3d4ce7577fabfb19a88f",
    "refs/preserve/engineering-audit/wip-2026-05-26": "ca59620b45da1fe0c35184335545d345652c97e2",
}


@dataclass(frozen=True)
class Worktree:
    name: str
    path: Path
    head: str
    branch: str | None


def run(
    args: list[str],
    *,
    cwd: Path | None = None,
    check: bool = True,
    stdout_path: Path | None = None,
) -> bytes:
    env = os.environ.copy()
    env["GIT_OPTIONAL_LOCKS"] = "0"
    env["GIT_PAGER"] = "cat"
    if stdout_path is None:
        result = subprocess.run(
            args,
            cwd=cwd,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
    else:
        stdout_path.parent.mkdir(parents=True, exist_ok=True)
        with stdout_path.open("wb") as output:
            result = subprocess.run(
                args,
                cwd=cwd,
                env=env,
                stdout=output,
                stderr=subprocess.PIPE,
                check=False,
            )
    if check and result.returncode != 0:
        stderr = result.stderr.decode("utf-8", errors="replace")
        raise RuntimeError(f"command failed ({result.returncode}): {args!r}\n{stderr}")
    return result.stdout if stdout_path is None else result.stderr


def git(repo: Path, *args: str) -> bytes:
    return run(["git", "-c", "i18n.logOutputEncoding=UTF-8", "-C", str(repo), *args])


def decode_paths(raw: bytes) -> list[str]:
    return [item.decode("utf-8", errors="surrogateescape") for item in raw.split(b"\0") if item]


def safe_relative_path(raw: str) -> Path:
    posix = PurePosixPath(raw)
    if posix.is_absolute() or not posix.parts or ".." in posix.parts:
        raise ValueError(f"unsafe repository path: {raw!r}")
    return Path(*posix.parts)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=True, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def slug(value: str) -> str:
    cleaned = "".join(ch if ch.isalnum() or ch in "._-" else "__" for ch in value)
    return cleaned.strip("._-") or "detached"


def is_within(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


def discover_worktrees(repo: Path) -> list[Worktree]:
    text = git(repo, "worktree", "list", "--porcelain").decode("utf-8", errors="replace")
    records = [record for record in text.strip().split("\n\n") if record.strip()]
    worktrees: list[Worktree] = []
    for record in records:
        fields: dict[str, str] = {}
        for line in record.splitlines():
            key, _, value = line.partition(" ")
            fields[key] = value
        path = Path(fields["worktree"]).resolve()
        branch_ref = fields.get("branch")
        branch = branch_ref.removeprefix("refs/heads/") if branch_ref else None
        name = "outer__" + slug(branch or fields["HEAD"][:12])
        worktrees.append(Worktree(name=name, path=path, head=fields["HEAD"], branch=branch))
    return worktrees


def index_path(repo: Path) -> Path:
    raw = git(repo, "rev-parse", "--path-format=absolute", "--git-path", "index")
    return Path(raw.decode("utf-8", errors="replace").strip()).resolve()


def file_record(root: Path, relative: str, *, git_blob: bool) -> dict[str, object]:
    rel_path = safe_relative_path(relative)
    path = root / rel_path
    exists = path.exists() or path.is_symlink()
    record: dict[str, object] = {"path": PurePosixPath(relative).as_posix(), "exists": exists}
    if not exists:
        return record
    details = path.lstat()
    record.update(
        {
            "mode": stat.S_IMODE(details.st_mode),
            "size": details.st_size,
            "sha256": sha256_file(path) if path.is_file() else None,
            "kind": "symlink" if path.is_symlink() else "file" if path.is_file() else "other",
        }
    )
    if path.is_symlink():
        record["link_target"] = os.readlink(path)
    if git_blob and path.is_file():
        record["git_blob"] = git(root, "hash-object", f"--path={relative}", "--", relative).decode().strip()
    return record


def add_payload_tar(tar_path: Path, root: Path, records: list[dict[str, object]]) -> None:
    with tarfile.open(tar_path, "w", format=tarfile.PAX_FORMAT, dereference=False) as archive:
        for record in records:
            if not record["exists"]:
                continue
            relative = str(record["path"])
            source = root / safe_relative_path(relative)
            archive.add(source, arcname=relative, recursive=False)


def capture_worktree(worktree: Worktree, target: Path, *, full_visible: bool = False) -> dict[str, object]:
    target.mkdir(parents=True, exist_ok=False)
    status = git(worktree.path, "status", "--porcelain=v2", "-z", "--branch", "--untracked-files=all")
    (target / "status.porcelain-v2.z").write_bytes(status)
    tracked = decode_paths(git(worktree.path, "diff", "HEAD", "--name-only", "-z", "--no-renames", "--"))
    untracked = decode_paths(git(worktree.path, "ls-files", "--others", "--exclude-standard", "-z", "--"))
    git_diff_args = [
        "git",
        "-c",
        "i18n.logOutputEncoding=UTF-8",
        "-C",
        str(worktree.path),
        "diff",
        "HEAD",
        "--binary",
        "--full-index",
        "--no-renames",
        "--",
    ]
    run(git_diff_args, stdout_path=target / "tracked.patch")
    run(
        [
            "git",
            "-c",
            "i18n.logOutputEncoding=UTF-8",
            "-C",
            str(worktree.path),
            "diff",
            "--cached",
            "--binary",
            "--full-index",
            "--no-renames",
            "--",
        ],
        stdout_path=target / "staged.patch",
    )
    records: list[dict[str, object]] = []
    for relative in tracked:
        record = file_record(worktree.path, relative, git_blob=True)
        record["source"] = "tracked_dirty"
        records.append(record)
    for relative in untracked:
        record = file_record(worktree.path, relative, git_blob=False)
        record["source"] = "untracked"
        records.append(record)
    write_json(target / "payload-manifest.json", records)
    add_payload_tar(target / "payload.tar", worktree.path, records)

    visible_count = None
    if full_visible:
        visible = decode_paths(git(worktree.path, "ls-files", "-co", "--exclude-standard", "-z", "--"))
        visible_records = [file_record(worktree.path, relative, git_blob=False) for relative in visible]
        write_json(target / "visible-files-manifest.json", visible_records)
        visible_count = len(visible_records)

    idx = index_path(worktree.path)
    index_copy = target / "index.bin"
    shutil.copy2(idx, index_copy)
    summary = {
        "name": worktree.name,
        "path": str(worktree.path),
        "head": worktree.head,
        "branch": worktree.branch,
        "index_path": str(idx),
        "index_size": index_copy.stat().st_size,
        "index_sha256": sha256_file(index_copy),
        "tracked_dirty_count": len(tracked),
        "untracked_count": len(untracked),
        "visible_count": visible_count,
        "payload_count": len(records),
    }
    write_json(target / "summary.json", summary)
    return summary


def refs_snapshot(repo: Path, target: Path) -> dict[str, str]:
    raw = git(repo, "for-each-ref", "--format=%(refname)%00%(objectname)%00%(objecttype)")
    target.write_bytes(raw)
    refs: dict[str, str] = {}
    for line in raw.splitlines():
        fields = line.split(b"\0")
        if len(fields) != 3:
            raise RuntimeError(f"unexpected for-each-ref record: {line!r}")
        ref, object_id, _object_type = (field.decode("utf-8", errors="strict") for field in fields)
        refs[ref] = object_id
    return refs


def verify_preservation_refs(inner_repo: Path) -> None:
    for ref, expected in PRESERVATION_REFS.items():
        actual = git(inner_repo, "rev-parse", ref).decode().strip()
        if actual != expected:
            raise RuntimeError(f"preservation ref mismatch: {ref}: {actual} != {expected}")


def clone_bundle(bundle: Path, target: Path, verify_root: Path) -> None:
    if target.exists() or not is_within(target.resolve(), verify_root.resolve()):
        raise RuntimeError(f"unsafe bundle restore target: {target}")
    run(["git", "init", "--quiet", str(target)])
    git(target, "symbolic-ref", "HEAD", "refs/heads/__bundle_restore__")
    git(target, "fetch", "--quiet", "--no-recurse-submodules", str(bundle), "+refs/*:refs/*")
    git(target, "fsck", "--full", "--no-progress")


def verify_payload_archive(source_dir: Path, verify_root: Path) -> None:
    records = json.loads((source_dir / "payload-manifest.json").read_text(encoding="utf-8"))
    extract_root = verify_root / source_dir.name
    extract_root.mkdir(parents=True, exist_ok=False)
    with tarfile.open(source_dir / "payload.tar", "r") as archive:
        for member in archive.getmembers():
            destination = (extract_root / safe_relative_path(member.name)).resolve()
            if not is_within(destination, extract_root.resolve()):
                raise RuntimeError(f"unsafe tar member: {member.name}")
        archive.extractall(extract_root)
    for record in records:
        if not record["exists"]:
            continue
        restored = extract_root / safe_relative_path(str(record["path"]))
        if not (restored.exists() or restored.is_symlink()):
            raise RuntimeError(f"payload missing after restore: {record['path']}")
        if record["kind"] == "file" and sha256_file(restored) != record["sha256"]:
            raise RuntimeError(f"payload hash mismatch: {record['path']}")
        if record["kind"] == "symlink" and os.readlink(restored) != record["link_target"]:
            raise RuntimeError(f"payload symlink mismatch: {record['path']}")


def index_blob(repo: Path, relative: str) -> str | None:
    raw = git(repo, "ls-files", "--stage", "-z", "--", relative)
    if not raw:
        return None
    entries = [entry for entry in raw.split(b"\0") if entry]
    if len(entries) != 1:
        raise RuntimeError(f"unexpected index entries for {relative!r}")
    metadata, separator, _path = entries[0].partition(b"\t")
    fields = metadata.split()
    if not separator or len(fields) != 3 or fields[2] != b"0":
        raise RuntimeError(f"unexpected index record for {relative!r}: {entries[0]!r}")
    return fields[1].decode("ascii")


def verify_patch(source_dir: Path, clone: Path) -> None:
    summary = json.loads((source_dir / "summary.json").read_text(encoding="utf-8"))
    records = json.loads((source_dir / "payload-manifest.json").read_text(encoding="utf-8"))
    git(clone, "read-tree", "--reset", summary["head"])
    patch = source_dir / "tracked.patch"
    if patch.stat().st_size:
        run(["git", "-C", str(clone), "apply", "--cached", "--binary", "--whitespace=nowarn", str(patch)])
    for record in records:
        if record["source"] != "tracked_dirty":
            continue
        actual_blob = index_blob(clone, str(record["path"]))
        if not record["exists"]:
            if actual_blob is not None:
                raise RuntimeError(f"deleted path restored unexpectedly: {record['path']}")
            continue
        if actual_blob != record["git_blob"]:
            raise RuntimeError(f"tracked payload mismatch after patch: {record['path']}")


def capture_wip_patches(inner_repo: Path, target: Path) -> list[dict[str, str]]:
    target.mkdir(parents=True, exist_ok=False)
    records: list[dict[str, str]] = []
    for ref, commit in PRESERVATION_REFS.items():
        name = slug(ref.rsplit("/", 1)[-1])
        parent = git(inner_repo, "rev-parse", f"{commit}^1").decode().strip()
        tree = git(inner_repo, "rev-parse", f"{commit}^{{tree}}").decode().strip()
        patch = target / f"{name}.patch"
        run(
            [
                "git", "-C", str(inner_repo), "diff", "--binary", "--full-index", "--no-renames",
                parent, commit, "--",
            ],
            stdout_path=patch,
        )
        records.append({"name": name, "ref": ref, "commit": commit, "parent": parent, "tree": tree, "patch": patch.name})
    write_json(target / "manifest.json", records)
    return records


def verify_wip_patches(source_dir: Path, clone: Path) -> None:
    records = json.loads((source_dir / "manifest.json").read_text(encoding="utf-8"))
    for record in records:
        git(clone, "read-tree", "--reset", record["parent"])
        patch = source_dir / record["patch"]
        if patch.stat().st_size:
            run(["git", "-C", str(clone), "apply", "--cached", "--binary", "--whitespace=nowarn", str(patch)])
        actual_tree = git(clone, "write-tree").decode().strip()
        if actual_tree != record["tree"]:
            raise RuntimeError(f"WIP patch tree mismatch: {record['ref']}: {actual_tree} != {record['tree']}")


def verify_live_worktree(source_dir: Path, worktree: Worktree) -> None:
    expected_status = (source_dir / "status.porcelain-v2.z").read_bytes()
    actual_status = git(worktree.path, "status", "--porcelain=v2", "-z", "--branch", "--untracked-files=all")
    if actual_status != expected_status:
        raise RuntimeError(f"worktree changed during capture: {worktree.path}")
    summary = json.loads((source_dir / "summary.json").read_text(encoding="utf-8"))
    idx = index_path(worktree.path)
    if idx.stat().st_size != summary["index_size"] or sha256_file(idx) != summary["index_sha256"]:
        raise RuntimeError(f"index changed during capture: {idx}")
    records = json.loads((source_dir / "payload-manifest.json").read_text(encoding="utf-8"))
    for expected in records:
        actual = file_record(worktree.path, str(expected["path"]), git_blob=expected["source"] == "tracked_dirty")
        for field in ("exists", "kind", "mode", "size", "sha256", "link_target", "git_blob"):
            if actual.get(field) != expected.get(field):
                raise RuntimeError(f"payload changed during capture: {worktree.path}: {expected['path']}: {field}")


def artifact_manifest(package: Path) -> list[dict[str, object]]:
    records: list[dict[str, object]] = []
    for path in sorted(item for item in package.rglob("*") if item.is_file()):
        if path.name == "artifact-manifest.json":
            continue
        records.append(
            {
                "path": path.relative_to(package).as_posix(),
                "size": path.stat().st_size,
                "sha256": sha256_file(path),
            }
        )
    return records


def verify_artifact_manifest(package: Path, records: Iterable[dict[str, object]]) -> None:
    for record in records:
        path = package / safe_relative_path(str(record["path"]))
        if not path.is_file():
            raise RuntimeError(f"backup artifact missing: {record['path']}")
        if path.stat().st_size != record["size"] or sha256_file(path) != record["sha256"]:
            raise RuntimeError(f"backup artifact mismatch: {record['path']}")


def remove_tree(path: Path, allowed_root: Path) -> None:
    resolved = path.resolve()
    root = allowed_root.resolve()
    if resolved == root or not is_within(resolved, root):
        raise RuntimeError(f"unsafe recursive-delete target: {resolved}")

    def make_writable(function: object, failed_path: str, _error: object) -> None:
        os.chmod(failed_path, stat.S_IWRITE)
        function(failed_path)  # type: ignore[operator]

    shutil.rmtree(resolved, onerror=make_writable)


def capture(repo: Path, primary: Path, secondary: Path) -> None:
    repo = repo.resolve()
    inner_repo = (repo / "inkforge").resolve()
    primary = primary.resolve()
    secondary = secondary.resolve()
    for target in (primary, secondary):
        if target.exists():
            raise FileExistsError(f"refusing to overwrite backup target: {target}")
        if is_within(target, repo):
            raise ValueError(f"backup target must be outside repository: {target}")
    verify_preservation_refs(inner_repo)

    primary_parent = primary.parent
    secondary_parent = secondary.parent
    primary_parent.mkdir(parents=True, exist_ok=True)
    secondary_parent.mkdir(parents=True, exist_ok=True)
    incomplete = primary_parent / f".{primary.name}.incomplete-{os.getpid()}"
    secondary_incomplete = secondary_parent / f".{secondary.name}.incomplete-{os.getpid()}"
    if incomplete.exists() or secondary_incomplete.exists():
        raise FileExistsError("incomplete backup target already exists")
    package = incomplete / "package"
    package.mkdir(parents=True)
    verification = incomplete / "verification"
    verification.mkdir()

    worktrees = discover_worktrees(repo)
    summaries: list[dict[str, object]] = []
    for worktree in worktrees:
        summaries.append(
            capture_worktree(
                worktree,
                package / "worktrees" / worktree.name,
                full_visible=worktree.path.resolve() == repo,
            )
        )

    inner = Worktree(
        name="nested__legacy-main",
        path=inner_repo,
        head=git(inner_repo, "rev-parse", "HEAD").decode().strip(),
        branch=git(inner_repo, "branch", "--show-current").decode().strip() or None,
    )
    summaries.append(capture_worktree(inner, package / "worktrees" / inner.name))

    outer_refs = refs_snapshot(repo, package / "outer-refs.z")
    inner_refs = refs_snapshot(inner_repo, package / "nested-refs.z")
    outer_worktrees = git(repo, "worktree", "list", "--porcelain")
    (package / "outer-worktrees.txt").write_bytes(outer_worktrees)
    capture_wip_patches(inner_repo, package / "nested-wip")
    run(["git", "-C", str(repo), "bundle", "create", str(package / "outer.bundle"), "--all"])
    run(["git", "-C", str(inner_repo), "bundle", "create", str(package / "nested.bundle"), "--all"])
    run(["git", "-C", str(repo), "bundle", "verify", str(package / "outer.bundle")])
    run(["git", "-C", str(inner_repo), "bundle", "verify", str(package / "nested.bundle")])

    outer_clone = verification / "outer-clone"
    nested_clone = verification / "nested-clone"
    clone_bundle(package / "outer.bundle", outer_clone, verification)
    clone_bundle(package / "nested.bundle", nested_clone, verification)
    for worktree in worktrees:
        source_dir = package / "worktrees" / worktree.name
        verify_payload_archive(source_dir, verification / "payloads")
        verify_patch(source_dir, outer_clone)
    inner_source = package / "worktrees" / inner.name
    verify_payload_archive(inner_source, verification / "payloads")
    verify_patch(inner_source, nested_clone)
    verify_wip_patches(package / "nested-wip", nested_clone)
    for ref, expected in PRESERVATION_REFS.items():
        actual = git(nested_clone, "rev-parse", ref).decode().strip()
        if actual != expected:
            raise RuntimeError(f"restored nested ref mismatch: {ref}")

    for worktree in worktrees:
        verify_live_worktree(package / "worktrees" / worktree.name, worktree)
    verify_live_worktree(inner_source, inner)
    if refs_snapshot(repo, verification / "outer-refs-final.z") != outer_refs:
        raise RuntimeError("outer refs changed during capture")
    if refs_snapshot(inner_repo, verification / "nested-refs-final.z") != inner_refs:
        raise RuntimeError("nested refs changed during capture")
    if git(repo, "worktree", "list", "--porcelain") != outer_worktrees:
        raise RuntimeError("outer worktree list changed during capture")

    metadata = {
        "schema": 2,
        "snapshot": "S0",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "repo": str(repo),
        "inner_repo": str(inner_repo),
        "outer_head": git(repo, "rev-parse", "HEAD").decode().strip(),
        "inner_head": inner.head,
        "outer_refs": outer_refs,
        "inner_refs": inner_refs,
        "worktrees": summaries,
        "preservation_refs": PRESERVATION_REFS,
    }
    write_json(package / "metadata.json", metadata)
    write_json(package / "verification-report.json", {"status": "pass", "checks": [
        "bundle-verify", "bundle-restore-all-refs-fsck", "payload-tar-roundtrip", "binary-patch-restore",
        "wip-patch-tree-restore", "preservation-ref-restore", "live-state-stability"
    ]})
    records = artifact_manifest(package)
    write_json(package / "artifact-manifest.json", records)
    verify_artifact_manifest(package, records)

    if not is_within(verification.resolve(), incomplete.resolve()):
        raise RuntimeError("verification directory escaped incomplete target")
    remove_tree(verification, incomplete)
    os.replace(incomplete, primary)

    shutil.copytree(primary, secondary_incomplete)
    secondary_package = secondary_incomplete / "package"
    secondary_records = json.loads((secondary_package / "artifact-manifest.json").read_text(encoding="utf-8"))
    verify_artifact_manifest(secondary_package, secondary_records)
    os.replace(secondary_incomplete, secondary)
    print(json.dumps({"status": "pass", "primary": str(primary), "secondary": str(secondary)}, ensure_ascii=False))


def self_test() -> None:
    with tempfile.TemporaryDirectory() as raw:
        root = Path(raw)
        source = root / "source"
        source.mkdir()
        samples = {
            "space name.txt": b"line one\nline two\n",
            "unicode-\u6d4b\u8bd5.bin": bytes(range(256)),
            "nested/path.json": b'{"ok":true}\n',
        }
        records: list[dict[str, object]] = []
        for relative, data in samples.items():
            path = source / safe_relative_path(relative)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
            record = file_record(source, relative, git_blob=False)
            record["source"] = "untracked"
            records.append(record)
        archive = root / "payload.tar"
        add_payload_tar(archive, source, records)
        bundle = root / "bundle"
        bundle.mkdir()
        write_json(bundle / "payload-manifest.json", records)
        shutil.copy2(archive, bundle / "payload.tar")
        verify_payload_archive(bundle, root / "verify")

        repo = root / "repo"
        run(["git", "init", "--quiet", str(repo)])
        (repo / "tracked.bin").write_bytes(bytes(range(128)))
        git(repo, "add", "--", "tracked.bin")
        git(repo, "-c", "user.name=InkForge Backup Self-Test", "-c", "user.email=self-test@example.invalid", "commit", "--quiet", "-m", "self-test")
        head = git(repo, "rev-parse", "HEAD").decode().strip()
        test_ref = "refs/preserve/self-test"
        git(repo, "update-ref", test_ref, head)
        refs = refs_snapshot(repo, root / "refs.z")
        if refs.get(test_ref) != head:
            raise RuntimeError("ref snapshot self-test failed")
        bundle_path = root / "self-test.bundle"
        run(["git", "-C", str(repo), "bundle", "create", str(bundle_path), "--all"])
        restored = root / "restored"
        clone_bundle(bundle_path, restored, root)
        if git(restored, "rev-parse", test_ref).decode().strip() != head:
            raise RuntimeError("bundle arbitrary-ref restore self-test failed")

        readonly = root / "readonly-tree"
        readonly.mkdir()
        readonly_file = readonly / "object"
        readonly_file.write_bytes(b"read-only")
        readonly_file.chmod(stat.S_IREAD)
        remove_tree(readonly, root)
    print("self-test: pass")


def main() -> int:
    parser = argparse.ArgumentParser(description="Capture and restore-verify InkForge Git/worktree state.")
    subparsers = parser.add_subparsers(dest="command", required=True)
    capture_parser = subparsers.add_parser("capture")
    capture_parser.add_argument("--repo", type=Path, required=True)
    capture_parser.add_argument("--primary", type=Path, required=True)
    capture_parser.add_argument("--secondary", type=Path, required=True)
    subparsers.add_parser("self-test")
    args = parser.parse_args()
    if args.command == "self-test":
        self_test()
    else:
        capture(args.repo, args.primary, args.secondary)
    return 0


if __name__ == "__main__":
    sys.exit(main())
