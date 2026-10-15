# Poultriz Camera Experiment Playbook

This guide describes how to test farm camera monitoring as a Poultriz feature, what equipment to buy, what to ask suppliers, how the app should work, and how to share the experiment online without exposing private information.

## 1. The experiment goal

Do not begin by trying to build a complete CCTV company. The first experiment should answer three questions:

1. Will farmers pay to see and monitor their farm remotely?
2. Which camera conditions matter most: live view, recording, motion alerts, night vision, or 4G access?
3. Can Poultriz provide a better farm workflow than the camera manufacturer's app alone?

A good first pilot is one camera, one farm, one farmer, and 30 days of real use.

## 2. Recommended first product

Start with a **Poultriz Farm Monitor** bundle:

- One compatible outdoor camera
- Installation guide or paid installation
- QR-code pairing with Poultriz
- Live remote viewing
- Camera online/offline status
- Motion notifications
- A small amount of cloud recording
- Camera linked to a farm, coop, or batch

Do not promise advanced poultry health detection in the first version. First prove that the camera stays online and farmers use it.

## 3. Camera requirements

Only buy a camera after the supplier confirms these requirements in writing:

### Essential

- Official cloud API or mobile SDK
- Remote live streaming
- Secure device pairing
- Device online/offline status
- Motion event or webhook support
- User/device ownership transfer
- Factory reset and unpairing process
- HTTPS/TLS communication
- Camera firmware update support
- Warranty and replacement process

### Strongly recommended

- 1080p or better video
- Infrared night vision
- Outdoor weather resistance, ideally IP66 or better
- Wide viewing angle
- Two-way audio, if useful for the farm
- MicroSD recording as a fallback
- 4G model or compatibility with a 4G router
- ONVIF or RTSP support as a secondary integration option
- Local storage plus cloud recording
- Stable performance in heat, dust, and power interruptions

### Avoid

- Cameras that only work in an unknown proprietary app
- Devices with no developer documentation
- Cameras requiring port forwarding for remote access
- Products with no ownership transfer or reset process
- Very cheap hardware with no warranty or replacement stock
- Any supplier that refuses to explain where video is stored

RTSP or ONVIF alone is not enough. They can provide a video stream, but Poultriz would still need secure remote access, authentication, bandwidth management, and possibly a streaming server.

## 4. Equipment checklist

### Camera installation

- Compatible outdoor camera
- Mounting bracket and screws
- Drill and masonry bits
- Screwdriver set
- Cable clips or conduit
- Weatherproof junction box
- Waterproof cable glands
- Ladder or safe access equipment
- Cable labels
- Spare power adapter
- Spare network cable, if required

### Power and connectivity

- Reliable power supply
- Surge protector
- UPS for the router and camera
- 4G router or external antenna where broadband is unreliable
- Data SIM with a suitable monthly allowance
- Spare SIM or backup connectivity for testing
- Solar and battery backup only after measuring actual power consumption

### Testing

- Android phone
- iPhone for cross-platform testing
- Laptop
- Wi-Fi signal tester or phone signal app
- Power meter if evaluating solar or battery operation
- Notebook or spreadsheet for uptime, data use, and incidents

### Optional farm sensors later

- Temperature and humidity sensor
- Door or gate sensor
- Water tank level sensor
- Power failure sensor
- Smoke or heat sensor

Do not add sensors until the camera pilot has proven that farmers will use the monitoring product.

## 5. Supplier questions

Send this checklist to every camera supplier:

- Do you provide a public API or SDK for third-party apps?
- Can a Poultriz user watch the live stream inside our app?
- Is the stream HLS, WebRTC, or another supported format?
- Can we receive motion events through webhooks?
- Can we create and manage device ownership through the API?
- Can a device be transferred to another user?
- Where are videos stored and for how long?
- What are the API rate limits and monthly costs?
- Is cloud storage included or charged separately?
- Can the device work with a 4G router?
- What happens when the internet or power goes off?
- Is the firmware update process controlled by the manufacturer?
- What is the warranty period and replacement process?
- Can we buy one sample unit before ordering in quantity?
- Can you provide test credentials, API documentation, and a sandbox device?

If the supplier cannot answer these questions, treat the product as incompatible until proven otherwise.

## 6. How the Poultriz architecture should work

The safest initial architecture is:

```text
Poultriz app
    |
    | authenticated request
    v
Poultriz backend / Supabase Edge Function
    |
    | provider API credentials stay server-side
    v
Camera provider cloud
    |
    v
Camera at the farm
```

The mobile app should not contain permanent camera-provider secrets. The app should request a short-lived playback or live-view token from a Supabase Edge Function.

### Suggested data records

Add a camera integration only after selecting a provider. The likely records are:

- `cameras`: farm owner, provider, device ID, name, status, location
- `camera_access`: camera ID, user ID, permission level
- `camera_events`: motion, offline, online, timestamp, metadata
- `camera_subscriptions`: plan, provider, renewal status
- `camera_installations`: address, installer, date, notes

Do not store camera passwords in normal database columns. Use the provider's OAuth or token exchange flow. If credentials must be stored, encrypt them and restrict access to server-side functions.

## 7. Pairing flow

The first pairing experience should be simple:

1. Farmer taps **Add camera**.
2. Farmer selects a farm or batch.
3. Farmer scans the QR code on the camera.
4. Poultriz opens the provider pairing flow.
5. Farmer connects the camera to Wi-Fi or 4G.
6. Poultriz receives the provider device ID.
7. Poultriz verifies ownership.
8. Farmer names the camera, for example `Main Coop`.
9. App displays the live feed and online status.

Required failure states:

- Invalid QR code
- Camera already owned by another account
- Wi-Fi setup failed
- Camera is offline
- Provider service unavailable
- Pairing timed out
- User cancelled pairing

Every pairing must have an **Unpair camera** and **Transfer ownership** path.

## 8. First app screens

### Camera list

Show:

- Camera name
- Farm or batch name
- Online/offline state
- Last seen time
- Small preview image
- Alert count

### Camera detail

Show:

- Live video
- Full-screen control
- Mute and speaker controls, if supported
- Snapshot button
- Recent motion events
- Recording playback, if supported
- Camera status and network information
- Link to the associated batch

### Farm monitor dashboard

Show only useful information:

- All cameras online/offline
- Recent motion alerts
- Last time each coop was viewed
- Temperature or humidity later, if sensors are added
- Feed, medication, and daily-record reminders beside camera status

The long-term advantage is combining video with farm operations. A camera alone is easy to replace; a farm workflow is harder to replace.

## 9. Security and privacy rules

Treat farm video as sensitive data.

- Use Supabase Row Level Security for every camera-related table.
- Verify that the signed-in user owns the farm before issuing a stream token.
- Never expose provider API secrets in the Expo app.
- Use short-lived tokens where the provider supports them.
- Log pairing, unpairing, sharing, and permission changes.
- Do not make camera feeds public by default.
- Add separate viewer and owner permissions.
- Provide account deletion and camera removal.
- Tell farmers where recordings are stored and how long they remain.
- Avoid recording workers or neighboring properties without appropriate consent.
- Do not publish identifiable footage, addresses, QR codes, device IDs, or customer names online.

Before public launch, get local legal advice about privacy, recording workers, property boundaries, and data retention.

## 10. Online experiment content

Share the building process, not private customer information.

Good content:

- Why remote farm monitoring matters
- Camera installation lessons
- Connectivity and power challenges
- Product sketches and app prototypes
- Anonymous uptime numbers
- Farmer feedback with permission
- Before-and-after workflow improvements
- A transparent explanation of what the camera can and cannot detect

Do not share:

- Live farm links
- QR codes
- Passwords or tokens
- Exact farm addresses
- Unblurred faces or license plates
- Customer names without permission
- Security weaknesses
- Recordings from a pilot farmer without written consent

Use a consent form that explains where footage, screenshots, quotes, and testimonials may be published.

## 11. Pilot plan

### Week 1: Validate

- Interview 5 to 10 farmers.
- Ask how they currently monitor farms when away.
- Ask what a missed event costs them.
- Ask whether they have stable Wi-Fi, 4G, or neither.
- Ask what they would pay monthly for remote monitoring.

### Week 2: Select hardware

- Shortlist two camera models.
- Buy one sample of each.
- Test the supplier app, API, night vision, heat, power recovery, and network recovery.
- Reject any device without a reliable integration path.

### Week 3: Build a technical proof of concept

- Create camera list and camera detail screens.
- Pair one device.
- Generate a server-side stream token.
- Play the stream in a development build.
- Display online/offline state.
- Receive one motion event.

The existing app is Expo Router with Supabase and native development-build support. Camera playback may require a native video package or provider SDK, so test on a development build rather than relying only on Expo Go.

### Week 4: Run the farm pilot

- Install one camera at one farm.
- Record uptime, video delay, data usage, power failures, and false alerts.
- Ask the farmer to use it daily.
- Record every support issue.
- Test unpairing and account recovery.

### After 30 days: Decide

Continue only if:

- The camera is reliable enough for daily use.
- The farmer opens the feature repeatedly.
- Alerts are useful rather than annoying.
- Connectivity and data costs are manageable.
- The farmer would pay for continued access.

## 12. Business model to test

Start with a simple bundle:

- Camera purchase price
- Optional installation fee
- One month of Poultriz monitoring included
- Monthly subscription for recording, alerts, and multi-camera access

Possible plans:

- **Basic:** live view and one camera
- **Pro:** recordings, alerts, and longer history
- **Farm:** multiple cameras, team access, and farm analytics

Do not set final prices until the pilot measures camera cost, installation time, cloud storage, video bandwidth, support time, replacement rate, and payment fees.

A basic contribution-margin calculation is:

```text
Monthly contribution
= subscription revenue
- cloud video cost
- notification cost
- payment fees
- support cost
- hardware warranty reserve
```

Hardware margin alone may not be enough. Recurring monitoring revenue is the stronger long-term model.

## 13. Definition of success

The first experiment is successful when one farmer says:

> “I check this every day, and I would keep paying for it.”

Track these measurements:

- Camera uptime percentage
- Number of app views per week
- Number of useful alerts
- False alert rate
- Average video start time
- Monthly data consumption
- Power interruptions recovered automatically
- Support incidents per camera
- Farmer willingness to pay
- Number of days the farmer used the camera without help

## 14. Recommended next action

Do these three things before purchasing inventory:

1. Interview five farmers and document their monitoring problems.
2. Contact three camera suppliers using the supplier questions in this guide.
3. Buy only one sample camera from the supplier with the clearest API, warranty, and ownership-transfer process.

The first goal is not to sell many cameras. It is to prove that Poultriz can make remote farm monitoring simple, reliable, and worth paying for.
