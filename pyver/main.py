from datetime import datetime, timedelta
# import os
from fastapi import FastAPI
import socketio
import asyncio

from dbagent import AssistantContext, get_all_tables, find_tables, try_generate_and_execute

DB_PATH = "college_data.db"
ALL_TABLES = get_all_tables(DB_PATH)

# Create Async Socket.IO server
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

# Create FastAPI app
app = FastAPI()

# Wrap FastAPI app with Socket.IO ASGI app
socket_app = socketio.ASGIApp(sio, app)

# Store user contexts (optional for multi-user support)
user_contexts = {}

@sio.event
async def connect(sid, environ):
    ip = environ.get('REMOTE_ADDR') or environ.get('HTTP_X_REAL_IP') or 'Unknown'
    print(f"Client connected: {sid}")
    # Create a context for this user session
    user_contexts[sid] = {
        'context': AssistantContext(),
        'last_message_time': datetime.min,
        'ip': ip  # Store IP for later
    }
    await sio.emit('bot-response', {'response': "👋 Welcome to CIET Assistant! What's your name?"}, to=sid)

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    user_contexts.pop(sid, None)


USER_LOG_FILE = "bot_users.txt"

@sio.event
async def register_user(sid, data):
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    timestamp = datetime.utcnow().isoformat()
    ip = user_contexts.get(sid, {}).get('ip', 'Unknown')


    if not name or not email:
        print(f"⚠️ Invalid name or email from {sid}: {data}")
        return

    user_info = f"{timestamp} | SID: {sid} | Name: {name} | Email: {email} | IP: {ip or 'N/A'}\n"

    try:
        with open(USER_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(user_info)
        print(f"✅ Registered user: {user_info.strip()}")
    except Exception as e:
        print(f"❌ Failed to write user info: {e}")


@sio.event
async def chat_message(sid, data):
    user_message = data.get('message', '').strip()
    print(f"Received from {sid}: {user_message}")

    if not user_message:
        return

    user_data = user_contexts.get(sid)
    if not user_data:
        user_data = {'context': AssistantContext(), 'last_message_time': datetime.min}
        user_contexts[sid] = user_data

    now = datetime.utcnow()
    time_since_last = now - user_data['last_message_time']
    if time_since_last < timedelta(seconds=1):
        await sio.emit('bot-response', {'response': "⏳ Please wait a second before sending another message."}, to=sid)
        return

    user_data['last_message_time'] = now
    ctx = user_data['context']
    ctx.reset()
    ctx.user_query = user_message

    await sio.emit('bot-typing', True, to=sid)

    try:
        ctx.selected_tables = find_tables(ctx.user_query, ALL_TABLES)
        if not ctx.selected_tables:
            response = "Could not identify relevant tables for your query. Please try rephrasing."
        else:
            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(None, try_generate_and_execute, ctx, DB_PATH)
    except Exception as e:
        response = f"Error processing your query: {e}"

    await sio.emit('bot-response', {'response': response}, to=sid)
    await sio.emit('bot-typing', False, to=sid)

# uvicorn main:socket_app --host 0.0.0.0 --port 3001 --reload