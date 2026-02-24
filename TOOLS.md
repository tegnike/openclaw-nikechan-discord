{
  "schema": "tools/v1",
  "description": "Skills define how tools work. This file is for your specifics — the stuff that's unique to your setup.",
  "sections": {
    "cameras": {
      "description": "Camera names and locations",
      "examples": [
        {"name": "living-room", "location": "Main area", "specs": "180° wide angle"},
        {"name": "front-door", "location": "Entrance", "trigger": "motion-triggered"}
      ]
    },
    "ssh": {
      "description": "SSH hosts and aliases",
      "examples": [
        {"alias": "home-server", "host": "192.168.1.100", "user": "admin"}
      ]
    },
    "tts": {
      "description": "Preferred voices for TTS",
      "examples": [
        {"preference": "Nova", "style": "warm, slightly British"},
        {"default_speaker": "Kitchen HomePod"}
      ]
    }
  },
  "purpose": "Environment-specific settings that shouldn't be shared with skills"
}