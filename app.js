import express from "express";
import crypto from "crypto";
import cors from "cors";
import axios from "axios"; //npm install express crypto cors axios
const app = express();
//const port = 3000; //部署到 Vercel 已不需要這行
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
  return JSON.parse(decodeURIComponent(DecryptedData));
}

//呼叫  ECPay API：付款 GetTokenbyTrade
async function RequestECPayAPIs(action, payload) {
  if (action == "GetTokenbyTrade") {
    try {
      const response = await axios.post(
        "https://ecpg-stage.ecpay.com.tw/Merchant/GetTokenbyTrade",
        payload
      );
      console.log("GetTokenByTrade: ", response.data);
      return response.data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  } else if (action == "CreatePayment") {
    try {
      const response = await axios.post(
        "https://ecpg-stage.ecpay.com.tw/Merchant/CreatePayment",
        payload
      );
      console.log("CreatePayment: ", response.data);
      return response.data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}

// 加解密：取得廠商驗證碼 GetTokenbyTrade：接收前端送來的加密前 Data，加密後再呼叫 API (async function RequestECPayAPIs)
app.post("/GetTokenbyTrade", async (req, res) => {
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
    const result = await RequestECPayAPIs(
      "GetTokenbyTrade",
      GetTokenbyTradePayload
    );
    const decryptedData = AESDecrypt(
      result.Data,
      MID[MerchantID].HashKey,
      MID[MerchantID].HashIV
    );
    res.json(decryptedData.Token);
  } catch (error) {
    console.error("Error in GetTokenbyTrade:", error);
    res.status(500).json({error: "內部伺服器錯誤"});
  }
});

// 加解密：建立付款 CreatePayment：接收前端送來的加密前 Data，加密後再呼叫 API (async function RequestECPayAPIs)
app.post("/CreatePayment", async (req, res) => {
  try {
    const {MerchantID, RqHeader, Data} = req.body;
    const encryptedData = AESEncrypt(
      Data,
      MID[MerchantID].HashKey,
      MID[MerchantID].HashIV
    );
    const CreatePaymentPayload = {
      MerchantID,
      RqHeader,
      Data: encryptedData
    };
    const result = await RequestECPayAPIs(
      "CreatePayment",
      CreatePaymentPayload
    );
    const decryptedData = AESDecrypt(
      result.Data,
      MID[MerchantID].HashKey,
      MID[MerchantID].HashIV
    );
    res.json(decryptedData);
  } catch (error) {
    console.error("Error in CreatePayment:", error);
    res.status(500).json({error: "內部伺服器錯誤"});
  }
});

//解密：接收 OrderResultURL 傳來的加密付款結果通知，解密後再回傳給 OrderResultURL
//OrderResuktURL 功能尚未完成
app.post("/OrderResultURL", async (req, res) => {
  try {
    const decryptedData = AESDecrypt(
      req,
      MID["MerchantID"].HashKey,
      MID["MerchantID"].HashIV
    );
    res.json(decryptedData);
 
  } catch (error) {
    console.error("Error in CreatePayment:", error);
    res.status(500).json({error: "OrderResultURL 錯誤"});
  }
});



app.post("/test", async (req, res) => {
  try {
  console.log("OK-1")
    res.json({OK:"OK-2"});
  } catch (error) {
    console.error(error);
    res.status(500).json({error: "錯誤"});
  }
});

// app.listen(port, () => {
//   console.log(`Server running at http://localhost:${port}`);
// });

// 部署到 Vercel 需要增加這一行
export default app;
