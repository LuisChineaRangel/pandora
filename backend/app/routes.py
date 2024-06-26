import uuid
from sympy import isprime
from flask import request, jsonify, redirect

from app import app
from app.services.curve_service import Curve

ec_instances = {}


@app.route("/uid", methods=["GET"])
def uid():
    try:
        return jsonify({"uid": str(uuid.uuid4())}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@app.route("/curve", methods=["POST"])
def generate_curve():
    try:
        data = request.get_json()
        ec_instances[data["uid"]] = Curve(int(data["a"]), int(data["b"]), True)
        return jsonify({"message": "Curve generated"}), 200
    except KeyError as e:
        return jsonify({"error": f"Missing key: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/points", methods=["POST"])
def calculate_points():
    try:
        data = request.get_json()
        uid, field = data["uid"], int(data["field"])

        if uid not in ec_instances:
            return jsonify({"error": "Curve not generated"}), 400
        if not isprime(field):
            return jsonify({"error": "Field must be prime"}), 400

        ec_instances[uid].field = field
        points = [point.toJSON() for point in ec_instances[uid].points]
        return jsonify({"message": "Points calculated", "points": points}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400
