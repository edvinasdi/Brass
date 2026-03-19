import http from "http";

const args = process.argv.slice(2);
const nameIndex = args.indexOf("--name");
if (nameIndex === -1 || !args[nameIndex + 1]) {
  console.error('Usage: npm run set-admin -- --name "YourName"');
  process.exit(1);
}

const name = args[nameIndex + 1];
const PORT = parseInt(process.env.PORT || "3000", 10);

const body = JSON.stringify({ name });

const options: http.RequestOptions = {
  hostname: "127.0.0.1",
  port: PORT,
  path: "/api/set-admin",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  },
};

const req = http.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    const result = JSON.parse(data);
    if (res.statusCode === 200) {
      console.log(`✓ Admin granted to "${result.adminPlayer}"`);
    } else {
      console.error(`✗ Error (${res.statusCode}): ${result.error}`);
      process.exit(1);
    }
  });
});

req.on("error", (err) => {
  console.error(`✗ Failed to connect to server: ${err.message}`);
  console.error(`  Make sure the server is running on port ${PORT}`);
  process.exit(1);
});

req.write(body);
req.end();
