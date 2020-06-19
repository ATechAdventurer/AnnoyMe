# AnnoyMe

Annoy Me is a simple web app that mediates messages sent from the general web and sends them to Home Assistant via the REST API

This application was built in about an hour and is not the most efficent it could possibly be, this code has not been extensively tested and is considered alpha software. Use at your own risk.

With that said if you have ideas about how to make it better feel free to submit a PR.

## Installation

1. Clone the repo or download it as a zip
2. `cd` into the folder containing this repo and run `npm install` from a command line
3. copy `.env.example` to `.env` and add the base url of your Home Assistant install including http:// or https:// make sure to include the port if nessisary
4. Go into your Home Assistant installation and generate a [Long Lived Token](https://developers.home-assistant.io/docs/auth_api/#token) and paste this after `HA_TOKEN=`
5. In Home Assistant create a new automation that is triggered by `sensor.annoying_message` state changing
6. (Optional) Set a condition to set a do not disturb to avoid hearing random messages in the night
7. Set the action to call a service that calls your TTS generator and sends it to the speakers of your choice my action looked like this: ```
data_template:
  entity_id: media_player.living_room_speaker
  message: '{{states(''sensor.annoying_message'')}}'
service: tts.google_translate_say
``` but yours may very.
8. Run `npm start` and you should be able to visit [localhost:3000](http://localhost:3000) to visit your message form
