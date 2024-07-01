import os
from flask import Flask
from flask_cors import CORS
from config import config

allowed_origin = os.getenv('ALLOWED_ORIGIN', '*')

app = Flask(__name__)
cors = CORS(app, resources={r"/api/*": {"origins": allowed_origin}})

config_name = os.getenv('FLASK_CONFIG', 'default')
app.config.from_object(config[config_name])

from app import routes
