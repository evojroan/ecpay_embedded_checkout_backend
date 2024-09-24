//npm install express crypto cors axios http ws
import express from "express";
import crypto from "crypto";
import cors from "cors";
import axios from "axios"; 
import { WebSocketServer } from "ws";
import http from 'http';

const app = express();
const port = 3000; //部署到 Vercel 已不需要這行
const AESAlgorithm = "aes-128-cbc";
const server = http.createServer(app); // 創建 HTTP 伺服器
const wss = new WebSocketServer({ server }); //將 express 交給 SocketServer 開啟 WebSocket 的服務

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

const MID = {
  3002607: { HashKey: "pwFHCqoQZGmho4w6", HashIV: "EkRm7iFT261dpevs" },
  3003008: { HashKey: "FCnGLNS7P3xQ2q3E", HashIV: "awL5GRWRhyaybq13" },
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
    const { MerchantID, RqHeader, Data } = req.body;
    const encryptedData = AESEncrypt(
      Data,
      MID[MerchantID].HashKey,
      MID[MerchantID].HashIV
    );
    const GetTokenbyTradePayload = {
      MerchantID,
      RqHeader,
      Data: encryptedData,
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
    res.status(500).json({ error: "內部伺服器錯誤" });
  }
});

// 加解密：建立付款 CreatePayment：接收前端送來的加密前 Data，加密後再呼叫 API (async function RequestECPayAPIs)
app.post("/CreatePayment", async (req, res) => {
  try {
    const { MerchantID, RqHeader, Data } = req.body;
    const encryptedData = AESEncrypt(
      Data,
      MID[MerchantID].HashKey,
      MID[MerchantID].HashIV
    );
    const CreatePaymentPayload = {
      MerchantID,
      RqHeader,
      Data: encryptedData,
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
    res.status(500).json({ error: "內部伺服器錯誤" });
  }
});

//解密：接收 OrderResultURL 傳來的加密付款結果通知，解密後再回傳給 OrderResultURL
//OrderResuktURL 功能尚未完成
app.post("/OrderResultURL", async (req, res) => {
  try {
    const { MerchantID, Data } = JSON.parse(req.body.ResultData);
    const decryptedData = AESDecrypt(
      Data,
      MID[MerchantID].HashKey,
      MID[MerchantID].HashIV
    );
    console.log(decryptedData);
    // 通過 WebSocket 廣播 decryptedData 給所有連接的客戶端
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(decryptedData));
      }
    });

    res.status(200).send("1|OK");  
  } catch (error) {
    console.error("Error in CreatePayment:", error);
    res.status(500).json({ error: "OrderResultURL 錯誤" });
  }
});

//WebSocket
wss.on("connection", (ws) => {
  console.log("WebSocket 已連接客戶端");

  ws.on("message", (data) => {
    //對 message 設定監聽，接收從 Client 發送的訊息。data 為 Client 發送的訊息，現在將訊息原封不動發送出去
    ws.send(data);
  });

  ws.on("close", () => {
    console.log("WebSocket 連接結束");
  });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// 部署到 Vercel 需要增加這一行
//export default app;
