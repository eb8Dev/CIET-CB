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
    print(f"Client connected: {sid}")
    # Create a context for this user session
    user_contexts[sid] = AssistantContext()
    await sio.emit('bot-response', {'response': "👋 Welcome to Chalapathi Assistant! What's your name?"}, to=sid)

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    user_contexts.pop(sid, None)

@sio.event
async def chat_message(sid, data):
    user_message = data.get('message', '')
    print(f"Received from {sid}: {user_message}")

    ctx = user_contexts.get(sid)
    if not ctx:
        ctx = AssistantContext()
        user_contexts[sid] = ctx

    ctx.reset()
    ctx.user_query = user_message

    await sio.emit('bot-typing', True, to=sid)

    try:
        ctx.selected_tables = find_tables(ctx.user_query, ALL_TABLES)
        if not ctx.selected_tables:
            response = "❌ Could not identify relevant tables for your query. Please try rephrasing."
        else:
            loop = asyncio.get_running_loop()
            # Run blocking function in a thread to avoid blocking the async event loop
            response = await loop.run_in_executor(None, try_generate_and_execute, ctx, DB_PATH)
    except Exception as e:
        response = f"❌ Error processing your query: {e}"

    await sio.emit('bot-response', {'response': response}, to=sid)
    await sio.emit('bot-typing', False, to=sid)
