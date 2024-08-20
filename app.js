import express from "express";
import crypto from "crypto";
import cors from "cors";
const app = express();
const port = 3000;
const AESAlgorithm = "aes-128-cbc";
app.use(express.json());
app.use(cors());

const MID = {
  3002607: { HashKey: "pwFHCqoQZGmho4w6", HashIV: "EkRm7iFT261dpevs" },
  3003008: { HashKey: "FCnGLNS7P3xQ2q3E", HashIV: "awL5GRWRhyaybq13" },
};


function AESEncrypt(inputParams,HashKey,HashIV) {
  let URLEncoded = encodeURIComponent(inputParams);
  const cipher = crypto.createCipheriv(AESAlgorithm, HashKey, HashIV);
  let EncryptedData = cipher.update(URLEncoded, "utf8", "base64");
  EncryptedData += cipher.final("base64");
  return EncryptedData;
}

function AESDecrypt(inputParams,HashKey,HashIV) {
  const decipher = crypto.createDecipheriv(AESAlgorithm, HashKey, HashIV);
  let DecryptedData = decipher.update(inputParams, "base64", "utf8");
  DecryptedData += decipher.final("utf8");
  return DecryptedData;
}

// 取得廠商驗證碼 GetToken(1)：接收前端送來的加密前 Data，並加密
app.post("/getTokenbyTrade", (req, res) => {
  const {Data } = req.body;
  const encryptedData = AESEncrypt(Data);
  //這裡還沒結束！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// 部署到 Vercel 需要增加這一行
export default app;

