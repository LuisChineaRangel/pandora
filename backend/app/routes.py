import uuid
from sympy import isprime
from flask import request, jsonify, redirect

from app import app
from app.services.point_service import Point
from app.services.curve_service import Curve

ecc = {}


@app.route("/api/uid", methods=["GET"])
def generate_uid():
    try:
        return jsonify(uuid.uuid4()), 200
    except ValueError as e:
        return jsonify(str(e)), 400


@app.route("/api/uid", methods=["PUT"])
def renew_uid():
    try:
        uid = request.json.get("uid")
        if uid in ecc:
            return jsonify(uid), 200
        return jsonify(uuid.uuid4()), 200
    except ValueError as e:
        return jsonify(str(e)), 400


@app.route("/api/curve", methods=["POST"])
def generate_curve():
    try:
        data = request.get_json()
        ecc[data["uid"]] = Curve(
            int(data["a"]), int(data["b"]), int(data["field"]), True
        )
        return jsonify("Curve generated"), 200
    except KeyError as e:
        return jsonify(f"Missing key: {str(e)}"), 400
    except Exception as e:
        return jsonify(str(e)), 400


@app.route("/api/curve/points", methods=["GET"])
def calculate_points():
    try:
        uid = request.args.get("uid")
        if uid not in ecc:
            return jsonify("Curve not found"), 404
        points = [point.to_json() for point in ecc[uid].points]
        return jsonify({"message": "Points calculated", "points": points}), 200
    except Exception as e:
        return jsonify(str(e)), 400


@app.route("/api/curve/base", methods=["POST"])
def set_base():
    try:
        data = request.get_json()
        uid = data["uid"]
        if uid not in ecc:
            return jsonify("Curve not found"), 404
        ecc[uid].base = Point(ecc[uid], data["x"], data["y"])
        return jsonify("Base point set"), 200
    except KeyError as e:
        return jsonify(f"Missing key: {str(e)}"), 400
    except Exception as e:
        return jsonify(str(e)), 400


@app.route("/api/curve/public", methods=["POST"])
def public_key():
    try:
        data = request.get_json()
        uid = data["uid"]
        if not ecc[uid]:
            return jsonify("Curve not found"), 404
        if not ecc[uid].base:
            return jsonify("Base point not set"), 404

        private_key, i = int(data["privateKey"]), data["i"]
        public_key = ecc[uid].base * private_key
        if public_key.at_infinity():
            return jsonify("Invalid private key"), 200

        ecc[uid].public_keys[f"{i}"] = public_key
        steps = [p.to_json() for p in ecc[uid].steps(ecc[uid].base, private_key)]
        response = {
            "message": "Public key generated",
            "public_key": public_key.to_json(),
            "steps": steps,
        }

        return (jsonify(response), 200)
    except Exception as e:
        return jsonify(str(e)), 400
