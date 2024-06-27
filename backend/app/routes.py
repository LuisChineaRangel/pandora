import uuid
from sympy import isprime
from flask import request, jsonify, redirect

from app import app
from app.services.curve_service import Curve

ec_instances = {}


@app.route("/api/uid", methods=["GET"])
def uid():
    try:
        return jsonify(uuid.uuid4()), 200
    except ValueError as e:
        return jsonify(str(e)), 400


@app.route("/api/curve", methods=["POST"])
def generate_curve():
    try:
        data = request.get_json()
        ec_instances[data["uid"]] = Curve(int(data["a"]), int(data["b"]), int(data["field"]), True)
        return jsonify("Curve generated"), 200
    except KeyError as e:
        return jsonify(f"Missing key: {str(e)}"), 400
    except Exception as e:
        return jsonify(str(e)), 400


@app.route("/api/curve/points", methods=["GET"])
def calculate_points():
    try:
        uid = request.args.get('uid')
        if uid not in ec_instances:
            return jsonify("Curve not found"), 404
        ec = ec_instances[uid]
        points = [point.toJSON() for point in ec_instances[uid].points]
        return jsonify({"message": "Points calculated", "points": points}), 200
    except Exception as e:
        return jsonify(str(e)), 400
