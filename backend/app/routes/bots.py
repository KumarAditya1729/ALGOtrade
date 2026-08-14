from flask import Blueprint, request, jsonify
from app.utils.auth import login_required, get_current_user_id
from app.services.user_preferences import get_notification_settings, update_notification_settings

bots_bp = Blueprint("bots", __name__)

@bots_bp.route("/telegram/config", methods=["GET"])
@login_required
def get_telegram_config():
    uid = get_current_user_id()
    ns = get_notification_settings(uid) or {}
    return jsonify({
        "status": "success",
        "data": {
            "has_token": bool(ns.get("telegram_bot_token")),
            "bot_username": "configured_bot" if ns.get("telegram_bot_token") else ""
        }
    })

@bots_bp.route("/telegram/config", methods=["POST"])
@login_required
def update_telegram_config():
    uid = get_current_user_id()
    data = request.json or {}
    ns = get_notification_settings(uid) or {}
    
    # We merge in the new token
    ns["telegram_bot_token"] = data.get("token") or ns.get("telegram_bot_token")
    update_notification_settings(uid, ns)
    
    return jsonify({"status": "success", "message": "Telegram config updated"})

@bots_bp.route("/telegram/bot/status", methods=["GET"])
@login_required
def telegram_bot_status():
    return jsonify({"status": "success", "data": {"is_running": True, "uptime": 3600}})

@bots_bp.route("/telegram/users", methods=["GET"])
@login_required
def telegram_users():
    return jsonify({"status": "success", "data": {"users": [], "stats": []}})

@bots_bp.route("/telegram/analytics", methods=["GET"])
@login_required
def telegram_analytics():
    return jsonify({"status": "success", "data": {"messages_sent": 0}})

@bots_bp.route("/whatsapp/config", methods=["GET"])
@login_required
def get_whatsapp_config():
    uid = get_current_user_id()
    ns = get_notification_settings(uid) or {}
    return jsonify({
        "status": "success",
        "data": {
            "is_paired": bool(ns.get("whatsapp_token")),
            "phone_number": "Meta API Configured" if ns.get("whatsapp_token") else ""
        }
    })

@bots_bp.route("/whatsapp/bot/status", methods=["GET"])
@login_required
def whatsapp_bot_status():
    return jsonify({"status": "success", "data": {"is_running": True}})

