const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { HfInference } = require('@huggingface/inference');
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const util = require('util');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const hf = new HfInference('YOUR_HUGGING_FACE_API_KEY');
const client = new textToSpeech.TextToSpeechClient();

wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    const { type, data } = JSON.parse(message);
    if (type === 'codeCompletion' || type === 'generalQuery') {
      const res = await hf.textGeneration({
        model: 'gpt2',
        inputs: data.prompt,
        parameters: { max_new_tokens: 100 },
      });
      const text = res.generated_text;
      const request = {
        input: { text },
        voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
        audioConfig: { audioEncoding: 'MP3' },
      };
      const [response] = await client.synthesizeSpeech(request);
      const writeFile = util.promisify(fs.writeFile);
      await writeFile('output.mp3', response.audioContent, 'binary');
      ws.send(JSON.stringify({ type: 'response', data: text, audio: 'output.mp3' }));
    }
  });
});

server.listen(3001, () => {
  console.log('Server is listening on port 3001');
});