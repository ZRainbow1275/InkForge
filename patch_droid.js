const fs = require("fs");
const file = "/app/src/routes/admin/droidAccounts.js";
let content = fs.readFileSync(file, "utf8");

if (!content.includes("ensureValidToken")) {
  console.log("Already patched or pattern not found");
  process.exit(0);
}

// Replace the broken ensureValidToken call with getValidAccessToken
content = content.replace(
  /\/\/ 确保 token 有效\n\s+const tokenResult = await droidAccountService\.ensureValidToken\(accountId\)\n\s+if \(!tokenResult\.success\) \{\n\s+return res\.status\(401\)\.json\(\{\n\s+error: 'Token refresh failed',\n\s+message: tokenResult\.error\n\s+\}\)\n\s+\}\n\n\s+const \{ accessToken \} = tokenResult/,
  `// 确保 token 有效
    let accessToken
    try {
      accessToken = await droidAccountService.getValidAccessToken(accountId)
    } catch (tokenError) {
      return res.status(401).json({
        error: 'Token refresh failed',
        message: tokenError.message
      })
    }`
);

fs.writeFileSync(file, content, "utf8");
console.log("Patch applied successfully");
