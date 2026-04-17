from __future__ import annotations

from flask import Flask, jsonify
from flask_cors import CORS

from routes import api_bp


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)
    app.register_blueprint(api_bp)

    @app.errorhandler(ValueError)
    def handle_value_error(err):
        return jsonify({'error': str(err)}), 400

    return app


app = create_app()


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
