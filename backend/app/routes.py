import re
import json
import uuid
from sympy import isprime
from flask import request, jsonify, redirect

from app import app
from app.services.point_service import Point
from app.services.curve_service import Curve
from app.services.setup_service import Setup
from app.services.pollig_hellman import PolligHellman
from app.services.baby_step_giant_step import BabyStepGiantStep

ecc = {}

CURVE_NOT_FOUND = "Curve not found"
BASE_NOT_SET = "Base point not set"


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
            return jsonify(CURVE_NOT_FOUND), 404
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
            return jsonify(CURVE_NOT_FOUND), 404
        ecc[uid].base = Point(ecc[uid], data["x"], data["y"])
        return jsonify("Base point set"), 200
    except KeyError as e:
        return jsonify(f"Missing key: {str(e)}"), 400
    except Exception as e:
        return jsonify(str(e)), 400


@app.route("/api/curve/public", methods=["GET"])
def get_public_keys():
    try:
        uid = request.args.get("uid")
        if uid not in ecc:
            return jsonify(CURVE_NOT_FOUND), 404
        public_keys = ecc[uid].public_keys.copy()
        for key in public_keys:
            public_keys[key] = public_keys[key].to_json()
        return (
            jsonify({"message": "Public keys retrieved", "public_keys": public_keys}),
            200,
        )
    except Exception as e:
        return jsonify(str(e)), 400


@app.route("/api/curve/public", methods=["POST"])
def public_k():
    try:
        data = request.get_json()
        uid = data["uid"]
        if uid not in ecc:
            return jsonify(CURVE_NOT_FOUND), 404
        if not ecc[uid].base:
            return jsonify(BASE_NOT_SET), 404

        private_k, i = int(data["privateKey"]), data["i"]
        public_k = ecc[uid].base * private_k
        if public_k.at_infinity():
            return jsonify({}), 204

        ecc[uid].public_keys[f"{i}"] = public_k
        steps = [p.to_json() for p in ecc[uid].steps(ecc[uid].base, private_k)]
        response = {
            "message": "Public key generated",
            "public_key": public_k.to_json(),
            "steps": steps,
        }

        return (jsonify(response), 200)
    except Exception as e:
        return jsonify(str(e)), 400


@app.route("/api/curve/shared", methods=["POST"])
def shared_key():
    try:
        data = request.get_json()
        uid = data["uid"]
        if uid not in ecc:
            return jsonify(CURVE_NOT_FOUND), 404
        if not ecc[uid].base:
            return jsonify(BASE_NOT_SET), 404

        private_k = int(data["privateKey"])
        shared_key_json = json.loads(data["sharedKey"])
        public_k = Point(ecc[uid], shared_key_json["x"], shared_key_json["y"])
        shared_key = public_k * private_k
        if shared_key.at_infinity():
            return jsonify({}), 204

        steps = [p.to_json() for p in ecc[uid].steps(public_k, private_k)]
        response = {
            "message": "Shared key generated",
            "shared_key": shared_key.to_json(),
            "steps": steps,
        }
        return jsonify(response), 200
    except Exception as e:
        return jsonify(str(e)), 400


@app.route("/api/curve/encode", methods=["POST"])
def encode():
    try:
        data = request.get_json()
        uid = data["uid"]
        if uid not in ecc:
            return jsonify(CURVE_NOT_FOUND), 404
        if not ecc[uid].base:
            return jsonify(BASE_NOT_SET), 404

        if "alphabet" not in data or "message" not in data:
            return jsonify("Missing key: alphabet or message"), 400

        alphabet, message = data["alphabet"], data["message"]
        encoded = ecc[uid].encode(alphabet, message)
        response = {
            "message": "Message encoded",
            "encoded": [point.to_json() for point in encoded],
        }
        return jsonify(response), 200
    except Exception as e:
        return jsonify(str(e)), 400


@app.route("/api/curve/encrypt", methods=["POST"])
def encrypt():
    try:
        data = request.get_json()
        uid = data["uid"]
        if uid not in ecc:
            return jsonify(CURVE_NOT_FOUND), 404
        if not ecc[uid].base:
            return jsonify(BASE_NOT_SET), 404

        if "alphabet" not in data or "message" not in data:
            return jsonify("Missing key: alphabet or message"), 400

        alphabet, message = data["alphabet"], data["message"]

        # Multiple receivers case
        if "encrypt" in data and "decrypt" in data:
            encrypt_json = json.loads(data["encrypt"])
            decrypt_json = json.loads(data["decrypt"])
            encrypt = Point(ecc[uid], encrypt_json["x"], encrypt_json["y"])
            decrypt = Point(ecc[uid], decrypt_json["x"], decrypt_json["y"])
            encrypted = ecc[uid].encrypt(alphabet, message, encrypt, decrypt, True)
            encrypted = [point.to_json() for point in encrypted]
        # Single receiver case
        elif "publicKey" in data and "privateKey" in data:
            private_k = int(data["privateKey"])
            parsed = json.loads(data["publicKey"])
            public_k = Point(ecc[uid], parsed["x"], parsed["y"])
            encrypted = ecc[uid].encrypt(alphabet, message, private_k, public_k)
            encrypted = [point[0].to_json() for point in encrypted]

        response = {
            "message": "Message encrypted",
            "encrypted": encrypted,
        }
        return jsonify(response), 200
    except Exception as e:
        return jsonify(str(e)), 400


@app.route("/api/curve/decrypt", methods=["POST"])
def decrypt():
    try:
        data = request.get_json()
        uid = data["uid"]
        if uid not in ecc:
            return jsonify(CURVE_NOT_FOUND), 404
        if not ecc[uid].base:
            return jsonify(BASE_NOT_SET), 404

        if "alphabet" not in data or "encrypted" not in data:
            return jsonify("Missing key: alphabet or encrypted"), 400

        points_pattern = r"\(\s*(\d+)\s*,\s*(\d+)\s*\)"
        alphabet, encrypted_points = data["alphabet"], [(int(x), int(y)) for x, y in re.findall(points_pattern, data["encrypted"])]
        if not encrypted_points:
            return jsonify("Invalid encrypted message. Format: [(x1, y1), (x2, y2), ...]"), 400
        encrypted = [
            Point(ecc[uid], int(x), int(y))
            for x, y in encrypted_points
        ]

        private_k = int(data["privateKey"])
        public_k = json.loads(data["publicKey"])
        public_k = Point(ecc[uid], int(public_k["x"]), int(public_k["y"]))

        decrypted = ecc[uid].decrypt(alphabet, encrypted, private_k, public_k)

        response = {"message": "Message decrypted", "decrypted": decrypted}
        return jsonify(response), 200
    except Exception as e:
        return jsonify(str(e)), 400

@app.route("/api/benchmark", methods=["POST"])
def benchmark():
    try:
        data = request.get_json()

        if "attackType" not in data:
            return jsonify("Missing key: attackType"), 400

        numCurves = data["numCurves"]
        numTests = data["numTests"]

        curves = []
        algorithm = data["attackType"]
        for i in range(numCurves):
            params = data["params"][i]
            curve = Curve(int(params["a"]), int(params["b"]), int(params["field"]))
            base = json.loads(params["base"])
            curve.base = Point(curve, int(base["x"]), int(base["y"]))
            curve.n = int(params["n"])
            if algorithm == "Pollig-Hellman":
                point_a = json.loads(params["point_a"])
                point_a = Point(curve, int(point_a["x"]), int(point_a["y"]))
                curves.append((curve, point_a))
            elif  algorithm == "Baby-Step Giant-Step":
                point_a = json.loads(params["point_a"])
                point_a = Point(curve, int(point_a["x"]), int(point_a["y"]))
                m = int(params["m"])
                curves.append((curve, point_a, m))
            else:
                curves.append(curve)

        results = []
        if algorithm == "Setup":
            benchmark = Setup.benchmark(curves, numTests)
        elif algorithm == "Pollig-Hellman":
            benchmark = PolligHellman.benchmark(curves, numTests)
        elif algorithm == "Baby-Step Giant-Step":
            benchmark = BabyStepGiantStep.benchmark(curves, numTests)
        else:
            return jsonify("Invalid algorithm"), 400
        for i, _ in enumerate(curves):
            if algorithm == "Pollig-Hellman" or algorithm == "Baby-Step Giant-Step":
                curve = curves[i][0]
            else:
                curve = curves[i]
            success_count = benchmark[i][0]
            rate = benchmark[i][1]
            elapsed_time = benchmark[i][2]
            results.append({
                "curve": str(i + 1),
                "a" : curve.a,
                "b" : curve.b,
                "field" : curve.field,
                "successes": success_count,
                "failures": numTests - success_count,
                "rate": rate,
                "time": elapsed_time,
            })
        return jsonify({"message": "Benchmark completed", "results": results}), 200
    except Exception as e:
        return jsonify(str(e)), 400
