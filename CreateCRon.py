from flask import Flask, jsonify, request, g
import sqlite3

app = Flask(__name__)
app.config['DATABASE'] = 'cron.db'
app.config['JSON_SORT_KEYS'] = False

# Função para conectar ao banco de dados SQLite
def connect_db():
    return sqlite3.connect(app.config['DATABASE'])

# Função para criar o banco de dados
def create_db():
    with app.app_context():
        db = get_db()
        with app.open_resource('schema.sql', mode='r') as f:
            db.cursor().executescript(f.read())
        db.commit()

# Função para obter a conexão com o banco de dados
def get_db():
    if 'db' not in g:
        g.db = connect_db()
    return g.db

# Função para fechar a conexão com o banco de dados no final da requisição
@app.teardown_appcontext
def close_db(error):
    if hasattr(g, 'db'):
        g.db.close()

# Rota para criar um novo cron
@app.route('/cron', methods=['POST'])
def create_cron():
    cron_data = request.json
    url = cron_data.get('url')
    last_execution = cron_data.get('last_execution')
    deletion = cron_data.get('deletion')
    cron = cron_data.get('cron')

    if not url:
        return jsonify({'error': 'Dados incompletos'}), 400

    db = get_db()
    db.execute('INSERT INTO cron (url, last_execution, deletion, cron) VALUES (?, ?, ?, ?)',
               [url, last_execution, deletion, cron])
    db.commit()
    
    return jsonify({'message': 'Cron criado com sucesso'}), 201

# Rota para listar todos os crons registrados
@app.route('/crons', methods=['GET'])
def get_crons():
    db = get_db()
    cur = db.execute('SELECT * FROM cron')
    crons = cur.fetchall()
    return jsonify({'crons': crons}), 200

# Rota para criar um novo registro de retorno da API
@app.route('/api_response', methods=['POST'])
def create_api_response():
    api_response_data = request.json
    cron_id = api_response_data.get('cron_id')
    response = api_response_data.get('response')
    status = api_response_data.get('status')

    if not cron_id or not response or not status:
        return jsonify({'error': 'Dados incompletos'}), 400

    db = get_db()
    db.execute('INSERT INTO api_response (cron_id, response, status) VALUES (?, ?, ?)',
               [cron_id, response, status])
    db.commit()
    
    return jsonify({'message': 'Registro de resposta da API criado com sucesso'}), 201

# Rota para listar todos os registros de respostas da API
@app.route('/api_responses', methods=['GET'])
def get_api_responses():
    db = get_db()
    cur = db.execute('SELECT * FROM api_response')
    api_responses = cur.fetchall()
    return jsonify({'api_responses': api_responses}), 200

if __name__ == '__main__':
    create_db()
    app.run()
