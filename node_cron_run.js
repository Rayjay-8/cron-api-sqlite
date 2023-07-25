const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');
const axios = require('axios');
var parser = require('cron-parser');


const app = express();
const db = new sqlite3.Database('cron.db');

// Função para atualizar a data de última execução no banco de dados
function updateLastExecution(cronId) {
   const currentDate = new Date().toISOString();
   db.run('UPDATE cron SET last_execution = ? WHERE id = ?', [currentDate, cronId], (err) => {
     if (err) {
       console.error("Erro ao atualizar a data de última execução no banco de dados:", err);
     }
   });
 }

 // Função para salvar o retorno da API e o código de resposta no banco de dados
function saveApiResponse(cronId, response, status) {

   console.log("response", response)
   db.run('INSERT INTO api_response (cron_id, response, status) VALUES (?, ?, ?)',
          [cronId, response, status], (err) => {
     if (err) {
       console.error("Erro ao salvar o retorno da API no banco de dados:", err);
     }
   });
 }


 function httpGet(url) {
   const headers = {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7,zh-TW;q=0.6,zh;q=0.5",
      "cache-control": "max-age=0",
      "sec-ch-ua": "\"Not/A)Brand\";v=\"99\", \"Google Chrome\";v=\"115\", \"Chromium\";v=\"115\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Linux\"",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
    };

    return axios.get(url, {headers})

   return new Promise((resolve, reject) => {
     http.get(url, (response) => {
       let data = '';
       response.on('data', (chunk) => {
         data += chunk;
       });
 
       response.on('end', () => {
         resolve({
           statusCode: response.statusCode,
           data: data
         });
       });
 
       response.on('error', (error) => {
         reject(error);
       });
     });
   });
 }


// Definir a função para executar a tarefa do cron
async function executeCronTask(cronData) {
   try {

    const response = await httpGet(cronData.url);
     
     // Obter o código de resposta HTTP
     const status = response.status;
      
     const responseData = JSON.stringify(response.data);
     // Salvar o retorno da API e o código de resposta no banco de dados
     saveApiResponse(cronData.id, responseData, status);
     
     console.log(`Tarefa do cron com ID ${cronData.id} executada com sucesso.`);
   } catch (error) {
     console.error(`Erro na execução da tarefa do cron com ID ${cronData.id}:`, error.message);
   }
 
   // Após a execução bem-sucedida do cron, atualize a data de última execução no banco de dados
   updateLastExecution(cronData.id);
 }


app.get('/pause_cron/:id', (req, res) => {
   const { id } = req.params;
   
   const scheduledJobs = cron.getTasks();
   console.log(id, scheduledJobs)

   if (scheduledJobs.has( id)) {
      console.log(scheduledJobs.get(id))
      scheduledJobs.get(id).stop()
      console.log(`Cron da tarefa com ID ${id} interrompido.`);
    }

})
// Rota para buscar crons pendentes e executá-los
app.get('/execute_crons', (req, res) => {
   
   const scheduledTasks = [];

  db.all('SELECT * FROM cron', [], (err, rows) => {
    if (err) {
      console.error("Erro ao buscar dados do banco de dados:", err);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }

    // Para cada cron retornado do banco de dados, agende a execução da tarefa
    rows.forEach((cronData) => {
      if (cronData.cron) {
   

        const job = cron.schedule(cronData.cron, () => {
         executeCronTask(cronData);
       });
      
       console.log(job.options.name)
       
       scheduledTasks.push({
         id: cronData.id,
         cron: cronData.cron,
         idjob: job.options.name,
         pausarLink: "http://localhost:5000/pause_cron/"+job.options.name,
         interval: parser.parseExpression(cronData.cron).next().toString()
       });
      }

    });

    res.json({ message: "Tarefas agendadas com sucesso", d: new Date(), scheduledTasks });
  });
});

const port = 5000;
app.listen(port, () => {
  console.log(`Servidor iniciado na porta ${port}`);
});
