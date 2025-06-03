import discord
from discord.ext import commands
import asyncio
import logging

logger = logging.getLogger(__name__)

class DiscordClient:
    def __init__(self):
        """Initialiser le client Discord"""
        self.bot = None
        self.token = None
        self._connected = False
        
    async def connect_and_validate(self, token):
        """Se connecter à Discord et valider le token"""
        try:
            self.token = token
            
            # Configuration des intents
            intents = discord.Intents.default()
            intents.guilds = True
            intents.guild_messages = True
            intents.message_content = True
            
            # Créer le bot
            self.bot = commands.Bot(command_prefix='!', intents=intents)
            
            # Event handlers
            @self.bot.event
            async def on_ready():
                logger.info(f'Bot connecté en tant que {self.bot.user}')
                self._connected = True
            
            @self.bot.event
            async def on_error(event, *args, **kwargs):
                logger.error(f'Erreur Discord dans {event}: {args}, {kwargs}')
            
            # Connexion avec timeout
            await asyncio.wait_for(self.bot.login(token), timeout=10.0)
            
            # Démarrer la connexion WebSocket
            await self.bot.connect(reconnect=False)
            
            return True
            
        except discord.LoginFailure:
            logger.error("Token Discord invalide")
            return False
        except asyncio.TimeoutError:
            logger.error("Timeout lors de la connexion Discord")
            return False
        except Exception as e:
            logger.error(f"Erreur de connexion Discord : {str(e)}")
            return False
    
    def is_connected(self):
        """Vérifier si le bot est connecté"""
        return self._connected and self.bot and not self.bot.is_closed()
    
    async def get_bot_info(self):
        """Récupérer les informations du bot"""
        if not self.is_connected():
            return {}
        
        try:
            return {
                'name': self.bot.user.name,
                'id': str(self.bot.user.id),
                'guild_count': len(self.bot.guilds)
            }
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des infos bot : {str(e)}")
            return {}
    
    async def get_guilds(self):
        """Récupérer la liste des serveurs/guildes"""
        if not self.is_connected():
            return []
        
        try:
            guilds = []
            for guild in self.bot.guilds:
                guilds.append({
                    'id': str(guild.id),
                    'name': guild.name,
                    'member_count': guild.member_count,
                    'owner': guild.owner.name if guild.owner else 'Inconnu'
                })
            return guilds
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des guildes : {str(e)}")
            return []
    
    async def get_guild_roles(self, guild_id):
        """Récupérer la liste des rôles d'une guilde"""
        if not self.is_connected():
            return []
        
        try:
            guild = self.bot.get_guild(guild_id)
            if not guild:
                return []
            
            roles = []
            for role in guild.roles:
                # Exclure le rôle @everyone et les rôles sans mention
                if role.name != '@everyone' and role.mentionable:
                    roles.append({
                        'id': str(role.id),
                        'name': role.name,
                        'color': str(role.color),
                        'members': len(role.members),
                        'mentionable': role.mentionable
                    })
            
            # Trier par position (rôles les plus élevés en premier)
            roles.sort(key=lambda x: x['name'])
            return roles
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des rôles : {str(e)}")
            return []
    
    async def get_guild_channels(self, guild_id):
        """Récupérer la liste des channels d'une guilde"""
        if not self.is_connected():
            return []
        
        try:
            guild = self.bot.get_guild(guild_id)
            if not guild:
                return []
            
            channels = []
            for channel in guild.text_channels:
                # Vérifier si le bot peut envoyer des messages dans ce channel
                permissions = channel.permissions_for(guild.me)
                if permissions.send_messages:
                    channels.append({
                        'id': str(channel.id),
                        'name': channel.name,
                        'category': channel.category.name if channel.category else 'Aucune',
                        'nsfw': channel.nsfw
                    })
            
            # Trier par catégorie puis par nom
            channels.sort(key=lambda x: (x['category'], x['name']))
            return channels
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des channels : {str(e)}")
            return []
    
    async def send_role_ping(self, guild_id, channel_id, role_id, custom_message=""):
        """Envoyer un message avec mention de rôle"""
        if not self.is_connected():
            return {'success': False, 'error': 'Bot non connecté'}
        
        try:
            guild = self.bot.get_guild(guild_id)
            if not guild:
                return {'success': False, 'error': 'Serveur non trouvé'}
            
            channel = guild.get_channel(channel_id)
            if not channel:
                return {'success': False, 'error': 'Channel non trouvé'}
            
            role = guild.get_role(role_id)
            if not role:
                return {'success': False, 'error': 'Rôle non trouvé'}
            
            # Vérifier les permissions
            permissions = channel.permissions_for(guild.me)
            if not permissions.send_messages:
                return {'success': False, 'error': 'Pas de permission d\'envoi de messages'}
            
            if not permissions.mention_everyone and not role.mentionable:
                return {'success': False, 'error': 'Rôle non mentionnable et pas de permission de mention'}
            
            # Construire le message au format "pseudo / guilde"
            bot_name = self.bot.user.display_name
            guild_name = guild.name
            
            # Message de base
            base_message = f"{bot_name} / {guild_name}"
            
            # Ajouter le message personnalisé si fourni
            if custom_message:
                full_message = f"{base_message}\n{custom_message}\n{role.mention}"
            else:
                full_message = f"{base_message}\n{role.mention}"
            
            # Envoyer le message
            message = await channel.send(full_message)
            
            logger.info(f"Message envoyé dans {guild.name}#{channel.name} mentionnant {role.name}")
            
            return {
                'success': True, 
                'message': 'Message envoyé avec succès',
                'message_id': str(message.id),
                'channel': f"#{channel.name}",
                'guild': guild.name,
                'role': role.name
            }
            
        except discord.Forbidden:
            return {'success': False, 'error': 'Permissions insuffisantes'}
        except discord.HTTPException as e:
            return {'success': False, 'error': f'Erreur HTTP Discord : {str(e)}'}
        except Exception as e:
            logger.error(f"Erreur lors de l'envoi du message : {str(e)}")
            return {'success': False, 'error': f'Erreur inattendue : {str(e)}'}
    
    async def send_special_message(self, guild_id, channel_id, message):
        """Envoyer un message spécial sans mention de rôle"""
        if not self.is_connected():
            return {'success': False, 'error': 'Bot non connecté'}
        
        try:
            guild = self.bot.get_guild(guild_id)
            if not guild:
                return {'success': False, 'error': 'Serveur non trouvé'}
            
            channel = guild.get_channel(channel_id)
            if not channel:
                return {'success': False, 'error': 'Channel non trouvé'}
            
            # Vérifier les permissions
            permissions = channel.permissions_for(guild.me)
            if not permissions.send_messages:
                return {'success': False, 'error': 'Pas de permission d\'envoi de messages'}
            
            # Envoyer le message spécial
            sent_message = await channel.send(message)
            
            logger.info(f"Message spécial envoyé dans {guild.name}#{channel.name}")
            
            return {
                'success': True, 
                'message': 'Message spécial envoyé avec succès',
                'message_id': str(sent_message.id),
                'channel': f"#{channel.name}",
                'guild': guild.name,
                'content': message
            }
            
        except discord.Forbidden:
            return {'success': False, 'error': 'Permissions insuffisantes'}
        except discord.HTTPException as e:
            return {'success': False, 'error': f'Erreur HTTP Discord : {str(e)}'}
        except Exception as e:
            logger.error(f"Erreur lors de l'envoi du message spécial : {str(e)}")
            return {'success': False, 'error': f'Erreur inattendue : {str(e)}'}

    async def disconnect(self):
        """Déconnecter le bot"""
        if self.bot and not self.bot.is_closed():
            await self.bot.close()
        self._connected = False
        logger.info("Client Discord déconnecté")
