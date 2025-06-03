import os
import asyncio
import json
from flask import Flask, render_template, request, jsonify
from discord_client import DiscordClient
import logging

# Configuration du logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

# Instance globale du client Discord
discord_client = None

# Configuration du canal par défaut
DEFAULT_CHANNEL_ID = os.getenv('DEFAULT_CHANNEL_ID', '')  # ID du canal prédéfini

@app.route('/')
def index():
    """Page principale de l'interface web"""
    return render_template('index.html')

@app.route('/api/connect', methods=['POST'])
def connect_discord():
    """Connecter le bot Discord avec le token fourni ou celui des variables d'environnement"""
    global discord_client
    
    try:
        data = request.get_json()
        provided_token = data.get('token', '').strip() if data else ''
        
        # Utiliser le token fourni ou celui des variables d'environnement
        token = provided_token or os.getenv('DISCORD_BOT_TOKEN', '')
        
        if not token:
            return jsonify({'success': False, 'error': 'Token Discord requis'})
        
        # Créer une nouvelle instance du client
        discord_client = DiscordClient()
        
        # Tenter la connexion de manière asynchrone
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            success = loop.run_until_complete(discord_client.connect_and_validate(token))
            if success:
                logger.info("Connexion Discord réussie")
                return jsonify({'success': True, 'message': 'Connexion réussie'})
            else:
                return jsonify({'success': False, 'error': 'Échec de la connexion Discord'})
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Erreur lors de la connexion : {str(e)}")
        return jsonify({'success': False, 'error': f'Erreur de connexion : {str(e)}'})

@app.route('/api/guilds', methods=['GET'])
def get_guilds():
    """Récupérer la liste des serveurs/guildes"""
    global discord_client
    
    if not discord_client or not discord_client.is_connected():
        return jsonify({'success': False, 'error': 'Bot non connecté'})
    
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            guilds = loop.run_until_complete(discord_client.get_guilds())
            return jsonify({'success': True, 'guilds': guilds})
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des guildes : {str(e)}")
        return jsonify({'success': False, 'error': f'Erreur : {str(e)}'})

@app.route('/api/roles/<guild_id>', methods=['GET'])
def get_roles(guild_id):
    """Récupérer la liste des rôles d'une guilde"""
    global discord_client
    
    if not discord_client or not discord_client.is_connected():
        return jsonify({'success': False, 'error': 'Bot non connecté'})
    
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            roles = loop.run_until_complete(discord_client.get_guild_roles(int(guild_id)))
            return jsonify({'success': True, 'roles': roles})
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des rôles : {str(e)}")
        return jsonify({'success': False, 'error': f'Erreur : {str(e)}'})

@app.route('/api/channels/<guild_id>', methods=['GET'])
def get_channels(guild_id):
    """Récupérer la liste des channels d'une guilde"""
    global discord_client
    
    if not discord_client or not discord_client.is_connected():
        return jsonify({'success': False, 'error': 'Bot non connecté'})
    
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            channels = loop.run_until_complete(discord_client.get_guild_channels(int(guild_id)))
            return jsonify({'success': True, 'channels': channels})
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des channels : {str(e)}")
        return jsonify({'success': False, 'error': f'Erreur : {str(e)}'})

@app.route('/api/send-message', methods=['POST'])
def send_message():
    """Envoyer un message avec mention de rôle dans le canal prédéfini"""
    global discord_client
    
    if not discord_client or not discord_client.is_connected():
        return jsonify({'success': False, 'error': 'Bot non connecté'})
    
    try:
        data = request.get_json()
        guild_id = data.get('guild_id')
        role_id = data.get('role_id')
        custom_message = data.get('message', '').strip()
        
        # Utiliser le canal prédéfini ou celui fourni
        channel_id = DEFAULT_CHANNEL_ID or data.get('channel_id')
        
        if not all([guild_id, role_id]):
            return jsonify({'success': False, 'error': 'Serveur et rôle requis'})
            
        if not channel_id:
            return jsonify({'success': False, 'error': 'Aucun canal configuré'})
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                discord_client.send_role_ping(
                    int(guild_id), 
                    int(channel_id), 
                    int(role_id), 
                    custom_message
                )
            )
            
            if result['success']:
                logger.info(f"Message envoyé avec succès dans {guild_id}/{channel_id}")
                return jsonify(result)
            else:
                return jsonify(result)
                
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Erreur lors de l'envoi du message : {str(e)}")
        return jsonify({'success': False, 'error': f'Erreur d\'envoi : {str(e)}'})

@app.route('/api/status', methods=['GET'])
def get_status():
    """Vérifier le statut de la connexion Discord"""
    global discord_client
    
    if discord_client and discord_client.is_connected():
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                bot_info = loop.run_until_complete(discord_client.get_bot_info())
                return jsonify({
                    'connected': True, 
                    'bot_name': bot_info.get('name', 'Bot'),
                    'bot_id': bot_info.get('id', ''),
                    'guild_count': bot_info.get('guild_count', 0)
                })
            finally:
                loop.close()
        except Exception as e:
            logger.error(f"Erreur lors de la vérification du statut : {str(e)}")
            return jsonify({'connected': False})
    else:
        return jsonify({'connected': False})

@app.route('/api/disconnect', methods=['POST'])
def disconnect_discord():
    """Déconnecter le bot Discord"""
    global discord_client
    
    if discord_client:
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                loop.run_until_complete(discord_client.disconnect())
                discord_client = None
                logger.info("Bot Discord déconnecté")
                return jsonify({'success': True, 'message': 'Déconnexion réussie'})
            finally:
                loop.close()
        except Exception as e:
            logger.error(f"Erreur lors de la déconnexion : {str(e)}")
            return jsonify({'success': False, 'error': f'Erreur de déconnexion : {str(e)}'})
    else:
        return jsonify({'success': True, 'message': 'Aucune connexion active'})

@app.route('/api/auto-connect', methods=['POST'])
def auto_connect():
    """Connexion automatique avec le token des variables d'environnement"""
    global discord_client
    
    token = os.getenv('DISCORD_BOT_TOKEN', '')
    if not token:
        return jsonify({'success': False, 'error': 'Aucun token dans les variables d\'environnement'})
    
    try:
        # Créer une nouvelle instance du client
        discord_client = DiscordClient()
        
        # Tenter la connexion de manière asynchrone
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            success = loop.run_until_complete(discord_client.connect_and_validate(token))
            if success:
                logger.info("Connexion automatique Discord réussie")
                return jsonify({'success': True, 'message': 'Connexion automatique réussie'})
            else:
                return jsonify({'success': False, 'error': 'Échec de la connexion automatique Discord'})
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Erreur lors de la connexion automatique : {str(e)}")
        return jsonify({'success': False, 'error': f'Erreur de connexion automatique : {str(e)}'})

@app.route('/api/config', methods=['GET'])
def get_config():
    """Récupérer la configuration actuelle"""
    return jsonify({
        'has_token': bool(os.getenv('DISCORD_BOT_TOKEN', '')),
        'has_default_channel': bool(DEFAULT_CHANNEL_ID),
        'default_channel_id': DEFAULT_CHANNEL_ID if DEFAULT_CHANNEL_ID else None
    })

if __name__ == '__main__':
    # Le token peut être fourni via une variable d'environnement pour un usage automatique
    default_token = os.getenv('DISCORD_BOT_TOKEN', '')
    if default_token:
        logger.info("Token Discord détecté dans les variables d'environnement")
    
    if DEFAULT_CHANNEL_ID:
        logger.info(f"Canal par défaut configuré : {DEFAULT_CHANNEL_ID}")
    else:
        logger.info("Aucun canal par défaut configuré")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
