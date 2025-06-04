import discord
import asyncio
import os

# Variables de config
TOKEN = os.getenv("DISCORD_BOT_TOKEN")  # Assure-toi que c'est bien défini
CHANNEL_ID = 1379094159742341325  # Salon où envoyer le message avec mention de rôle
ROLE_ID = 1379103056494596116  # Rôle à mentionner
MESSAGE = f"<@&{ROLE_ID}> Indiquez vos pseudo/guilde/grade svp"
INTERVAL = 4 * 60 * 60  # 4 heures
SPAM_CHANNEL_ID = 1379739284436811836  # Salon où envoyer "teste" toutes les 30s

# Discord bot
intents = discord.Intents.default()
client = discord.Client(intents=intents)

# Fonction qui envoie MESSAGE toutes les 4h
async def send_periodic_message():
    await client.wait_until_ready()
    channel = client.get_channel(CHANNEL_ID)

    if channel is None:
        print("❌ Salon principal introuvable")
        return

    while not client.is_closed():
        await channel.send(MESSAGE)
        print("✅ Message périodique envoyé")
        await asyncio.sleep(INTERVAL)

# Fonction qui envoie "teste" toutes les 30 secondes
async def spam_teste_message():
    await client.wait_until_ready()
    channel = client.get_channel(SPAM_CHANNEL_ID)

    if channel is None:
        print("❌ Salon de spam introuvable")
        return

    while not client.is_closed():
        await channel.send("teste")
        print("📨 Message 'teste' envoyé")
        await asyncio.sleep(30)

@client.event
async def on_ready():
    print(f"✅ Connecté en tant que {client.user}")
    asyncio.create_task(send_periodic_message())
    asyncio.create_task(spam_teste_message())

# Lancer le bot
client.run(TOKEN)