import express from "express";
import crypto from "crypto";
import cors from "cors";
import axios from "axios"; //npm install express crypto cors axios
const app = express();
const port = 3000;
const AESAlgorithm = "aes-128-cbc";
app.use(express.json());
app.use(cors());

const MID = {
  3002607: {HashKey: "pwFHCqoQZGmho4w6", HashIV: "EkRm7iFT261dpevs"},
  3003008: {HashKey: "FCnGLNS7P3xQ2q3E", HashIV: "awL5GRWRhyaybq13"}
};

//將 Data 加密
function AESEncrypt(inputParams, HashKey, HashIV) {
  let URLEncoded = encodeURIComponent(JSON.stringify(inputParams));
  const cipher = crypto.createCipheriv(AESAlgorithm, HashKey, HashIV);
  let EncryptedData = cipher.update(URLEncoded, "utf8", "base64");
  EncryptedData += cipher.final("base64");
  return EncryptedData;
}

//將綠界回傳的 Data 解密
function AESDecrypt(inputParams, HashKey, HashIV) {
  const decipher = crypto.createDecipheriv(AESAlgorithm, HashKey, HashIV);
  let DecryptedData = decipher.update(inputParams, "base64", "utf8");
  DecryptedData += decipher.final("utf8");
  return JSON.parse(decodeURIComponent(DecryptedData))
}

//呼叫  ECPay API
async function getECPayTokens(action, payload) {
  if (action == "getTokenbyTrade") {
    try {
      const response = await axios.post(
        "https://ecpg-stage.ecpay.com.tw/Merchant/GetTokenbyTrade",
        payload
      );
      console.log(response.data);
      return response.data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  } else if (action == "CreatePayment") {
    return;
  }
}

// 取得廠商驗證碼 GetToken(1)：接收前端送來的加密前 Data，加密後再呼叫 API
app.post("/getTokenbyTrade", async (req, res) => {
  try {
    const {MerchantID, RqHeader, Data} = req.body;
    const encryptedData = AESEncrypt(
      Data,
      MID[MerchantID].HashKey,
      MID[MerchantID].HashIV
    );
    const GetTokenbyTradePayload = {
      MerchantID,
      RqHeader,
      Data: encryptedData
    };
    const result = await getECPayTokens(
      "getTokenbyTrade",
      GetTokenbyTradePayload
    );
    const decryptedData = AESDecrypt(result.Data, MID[MerchantID].HashKey, MID[MerchantID].HashIV);
    res.json(decryptedData.Token);
  } catch (error) {
    console.error("Error in getTokenbyTrade:", error);
    res.status(500).json({error: "內部伺服器錯誤"});
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// 部署到 Vercel 需要增加這一行
//export default app;
