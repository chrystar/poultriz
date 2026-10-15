# Poultriz Brooder Controller Playbook

This guide describes how to test a Poultriz product that monitors and controls brooding temperature. It covers the equipment, tools, app behavior, safety requirements, supplier questions, and pilot process.

The first goal is not to build a heating appliance from scratch. The first goal is to combine a certified heat source with a safe controller and prove that farmers value reliable brooder monitoring.

## 1. Product idea

The product can be called **Poultriz Brooder Guard**.

A complete bundle could provide:

- Certified brooder or infrared heat source
- Temperature and humidity sensing
- Local thermostat control
- Poultriz mobile monitoring
- Temperature history
- Brooding schedule
- High and low temperature alerts
- Power-failure alerts
- Sensor-disconnected alerts
- Optional camera connection
- Optional backup power

The controller must remain safe if the internet, phone, or Poultriz app is unavailable.

## 2. Recommended first experiment

Start with an electric infrared brooder, not gas ignition.

The first pilot should support:

- Local automatic temperature control
- Local display of temperature and operating state
- Remote temperature monitoring
- Remote target-temperature changes within safe limits
- Remote emergency shutdown
- Local physical emergency stop
- High-temperature cutoff
- Sensor-failure protection
- Power recovery behavior

Do not begin with remote gas ignition. Gas introduces flame, fuel, ventilation, carbon-monoxide, and ignition risks that require certified equipment and specialist review.

## 3. Brooder system components

### Heating equipment

Choose one certified product for the pilot:

- Electric infrared brooder
- Certified brooder thermostat or temperature controller
- Heater mounting frame or manufacturer-approved stand
- Manufacturer-approved power cable and connector
- Protective guard around the hot surface
- Manual power switch
- Physical emergency stop
- Independent thermal cutoff

Do not use exposed heating elements, damaged cables, improvised connectors, or an unprotected household extension lead in a poultry house.

### Monitoring equipment

- Digital temperature sensor
- Humidity sensor
- Optional second temperature sensor for redundancy
- Local temperature display
- Controller enclosure
- Sensor cable or approved wireless sensor
- Cable strain relief
- Protective conduit
- Labels for sensors and cables

The primary temperature sensor should be positioned at chick height, not beside the heater or high on the wall. Use a second sensor during testing to identify a bad reading.

### Power and protection

- Properly rated power supply
- Surge protection
- Correct fuse or circuit protection
- UPS for the controller and connectivity equipment
- Optional battery backup
- Backup lighting
- Generator or solar system only after measuring actual load
- Power-failure sensor or controller status reporting
- Grounding and bonding completed by a qualified electrician

A backup battery may keep monitoring online, but it may not be able to power the heater for long. Display heater power and controller power separately in the app.

### Connectivity

- Wi-Fi router, if available
- 4G router where fixed internet is unreliable
- Data SIM with enough monthly allowance
- External 4G antenna where signal strength requires it
- Backup connectivity for the pilot
- Router UPS

The brooder must continue temperature control locally without internet. Connectivity is for alerts, history, and remote supervision.

## 4. Installation tools

Use a qualified electrician for mains work. The following tools are for approved installation and testing:

- Insulated screwdriver set
- Drill and appropriate bits
- Mounting screws and anchors
- Cable clips
- Conduit and cable glands
- Weather-resistant electrical enclosure
- Wire labels
- Cable ties
- Spirit level
- Measuring tape
- Ladder or safe access equipment
- Torch or inspection light
- Cleaning brush for dust removal
- Protective gloves
- Safety glasses
- Non-contact voltage tester used by a qualified person
- Multimeter used by a qualified person
- Clamp meter used by a qualified person
- Infrared thermometer
- Portable temperature and humidity meter
- Power meter
- Smoke alarm for the test area
- Carbon-monoxide detector if any fuel-burning appliance is present
- Fire extinguisher suitable for the installation environment

Do not open or modify a sealed heater or controller unless the manufacturer authorizes it and the work is performed by a qualified professional.

## 5. Gas brooder requirements

A gas brooder should be treated as a separate, later product track.

Required safety systems may include:

- Certified gas appliance
- Certified gas valve
- Flame-failure detection
- Automatic fuel shutoff
- Approved ignition system
- Correct regulator and hose
- Ventilation verification
- Carbon-monoxide detection
- Leak testing by a qualified gas technician
- Physical emergency shutoff
- Fire protection
- Local compliance and certification

For the initial gas pilot, Poultriz should provide monitoring only:

- Temperature
- Flame status, if supported by the certified appliance
- Gas or appliance fault status
- Carbon monoxide
- Power status
- Remote emergency shutdown where the certified system supports it

Do not build or sell a remote gas ignition circuit from general-purpose relays. Do not allow the app to bypass a local safety interlock.

## 6. Local controller behavior

The local controller is the safety authority. The app is a remote interface.

The controller should:

- Read the temperature sensor continuously
- Regulate the heater locally
- Enforce minimum and maximum limits
- Shut down on overheating
- Detect a missing or invalid sensor
- Use a safe fallback state
- Record local faults
- Resume safely after power returns
- Require local confirmation after a serious fault
- Work without internet

The app should never send a command that directly energizes an unprotected heater. It should request a mode or target temperature from the controller, which validates the request.

## 7. App controls

### Brooder overview

```text
Brooder House

Temperature     33.2°C     Good
Humidity        58%        Good
Target          33.0°C
Heater          Running
Controller      Online
Power           Online

[Change target] [Stop heating]
```

### Useful controls

- Enable or disable automatic mode
- Set a target temperature within approved limits
- Set a bird-age schedule
- Temporarily reduce or increase the target
- Stop heating
- Acknowledge an alert
- View temperature history
- View power and controller events
- Test the alarm
- Name the brooder and link it to a batch

### Controls that require extra protection

- Starting heat remotely after a fault
- Starting gas ignition remotely
- Changing maximum temperature limits
- Disabling an overheat protection
- Enabling a schedule without a sensor

These should require local confirmation, an administrator role, or should not be available at all.

## 8. Alerts

Send alerts only when the farmer can act on them:

- Temperature below safe configured range
- Temperature above safe configured range
- Heater has been on unusually long
- Heater is not responding
- Sensor disconnected
- Sensor reading is implausible
- Power lost
- Controller offline
- Battery backup is low
- Carbon monoxide detected
- Gas appliance fault detected
- Brooding schedule changed
- Temperature is fluctuating excessively

Every alert should show:

- What happened
- When it happened
- Which brooder is affected
- Current temperature
- The recommended immediate action
- Whether the heater stopped automatically

## 9. Brooding schedule

Use a configurable schedule based on bird type, age, breed, housing, and local conditions. Do not hardcode one temperature for every farm.

A schedule can contain:

- Batch or brooder name
- Bird type
- Start date
- Chick age
- Target temperature
- Allowed temperature range
- Humidity target, if used
- Schedule change history
- Person who approved the change

The farmer should be able to pause or adjust a schedule. Major changes should be recorded for later analysis.

Temperature guidance should be reviewed with a poultry specialist or veterinarian for the farmer's bird type and housing conditions. Chick behavior remains important: clustering may indicate cold, while avoiding the heat may indicate excessive temperature.

## 10. Data model for Poultriz

Likely records include:

- `brooders`: farm, batch, name, type, status, provider
- `brooder_devices`: hardware ID, firmware, controller state
- `brooder_sensors`: sensor ID, type, position, calibration status
- `brooder_readings`: timestamp, temperature, humidity, power, heater state
- `brooder_schedules`: age range, target, safe limits, active status
- `brooder_alerts`: alert type, severity, timestamp, acknowledgement
- `brooder_commands`: requested action, user, result, timestamp
- `brooder_installations`: installer, location, date, notes
- `brooder_maintenance`: inspection, calibration, replacement, result

Use Row Level Security so a farmer can access only their own farm and devices. Keep provider keys and device credentials in server-side functions, never in the Expo app.

## 11. Device communication architecture

```text
Poultriz mobile app
        |
        | authenticated command or reading request
        v
Supabase Edge Function / device API
        |
        | validates ownership and safe command limits
        v
Brooder controller cloud or secure gateway
        |
        v
Local brooder controller
        |
        v
Sensor + certified heater
```

The preferred controller behavior is local-first:

- Sensor readings are collected locally.
- Temperature regulation happens locally.
- Recent readings are buffered if the internet fails.
- The controller syncs history when connectivity returns.
- Remote commands expire if they are not acknowledged.
- Safety shutdowns are local and cannot be overridden by a stale app command.

## 12. Supplier checklist

Ask every hardware supplier:

- Is the heater certified for its intended market?
- What is its rated voltage, current, and power consumption?
- Does it have an independent thermal cutoff?
- What controller or thermostat is approved for it?
- Does the controller work without internet?
- Is there an official API, SDK, or documented protocol?
- Can we read temperature, heater state, power state, and faults?
- Can we set a safe target temperature remotely?
- Are maximum limits enforced in the controller?
- What happens when a sensor disconnects?
- What happens after power returns?
- Can the device be factory-reset and transferred to another user?
- Where are device readings stored?
- What is the warranty and spare-parts process?
- Is calibration supported and documented?
- Can we purchase one sample before ordering in quantity?
- Can the supplier provide compliance documents and test credentials?

For gas equipment, also ask:

- Is the appliance certified for the intended fuel and country?
- How is flame failure detected?
- How does automatic gas shutoff work?
- Is remote ignition supported by the certified system?
- What ventilation requirements apply?
- How is carbon monoxide detected?
- Who is qualified to install and service it?

## 13. Testing plan

### Bench test

Before installing on a farm:

- Confirm the sensor reading against a second meter.
- Test the controller with the heater disconnected or using an approved test load.
- Test high and low temperature alerts.
- Disconnect the sensor and confirm safe behavior.
- Remove internet access and confirm local control continues.
- Remove power and confirm the recovery behavior.
- Test the physical emergency stop.
- Test that unsafe temperature limits cannot be entered.
- Measure power consumption.

### Controlled room test

- Install the system in a safe, supervised space.
- Run the heater through its normal cycle.
- Measure temperature at several points.
- Check heat distribution and hot spots.
- Test dust and cable protection.
- Confirm the alarm can be heard locally.
- Run the system for several days before a farm pilot.

### Farm pilot test

- Install with a qualified professional.
- Photograph the installation for maintenance records.
- Record starting temperature and sensor positions.
- Observe chick behavior with a poultry specialist or experienced farmer.
- Record power failures, internet failures, alerts, and manual overrides.
- Confirm the farmer understands local emergency controls.
- Inspect cables, mounts, dust, and sensor position regularly.

## 14. Maintenance checklist

Daily or routine checks:

- Confirm the controller is online.
- Confirm temperature is plausible.
- Confirm the heater state matches the target.
- Check the physical installation visually.
- Check that chicks are distributed normally.
- Confirm no cables are exposed to pecking or moisture.

Scheduled checks:

- Clean dust from approved external surfaces.
- Check mounting and cable strain relief.
- Inspect plugs, sockets, and enclosure condition.
- Test the alarm and emergency stop.
- Check calibration against a reference meter.
- Review alert history.
- Replace damaged sensors immediately.

Never ask a farmer to ignore repeated alerts. A recurring alert means the system, environment, or setup needs investigation.

## 15. Pilot business model

Start with:

- Certified brooder equipment
- Controller and sensors
- Installation fee
- Setup and training
- One month of monitoring included
- Monthly subscription for alerts, history, and remote controls
- Replacement sensor and maintenance service

Possible plans:

- **Monitor:** readings, history, and alerts
- **Control:** monitor plan plus approved electric-heater control
- **Farm:** multiple brooders, camera connection, team access, and reports

Do not price the product until you know:

- Hardware cost
- Import and delivery cost
- Installation labor
- Replacement rate
- Cloud and notification cost
- Support time
- Warranty reserve
- Payment fees
- Data and connectivity cost

## 16. Online sharing rules

Safe content to share:

- The brooder problem being solved
- Prototype screens
- Anonymous temperature charts
- Installation lessons
- Power and connectivity lessons
- Farmer feedback with written permission
- Safety decisions and limitations
- Test results from a controlled environment

Do not share:

- Remote control links
- Device credentials or pairing codes
- Exact farm addresses
- Unblurred workers or visitors
- Private sensor data tied to a named farmer
- Detailed weaknesses that could help someone disable the system
- Claims that the product is certified when it is not
- Advice to bypass safety equipment

Use a release form before publishing footage, quotes, screenshots, or testimonials from a pilot farm.

## 17. Four-week pilot

### Week 1: Customer validation

- Interview five to ten poultry farmers.
- Ask about chick losses caused by cold, overheating, or power failures.
- Ask how they currently regulate temperature.
- Ask how often someone checks the brooder at night.
- Ask what they would pay for reliable monitoring.

### Week 2: Hardware selection

- Select two certified electric brooder options.
- Obtain one sample of each.
- Confirm documentation, warranty, parts, and local service.
- Reject systems with no safe controller or no supplier support.

### Week 3: Proof of concept

- Connect one controller and sensor.
- Store readings securely.
- Show live temperature in a development build.
- Send high and low temperature alerts.
- Test local control with internet disabled.
- Test remote shutdown only after safety validation.

### Week 4: Supervised farm pilot

- Install one brooder system.
- Train the farmer on local controls and emergency shutdown.
- Track temperature stability, uptime, alert quality, and power use.
- Record every support issue.
- Inspect the installation regularly.

## 18. Success criteria

Continue the experiment only if:

- Temperature stays within the configured safe range.
- Local control works during internet failure.
- Safety shutdowns work reliably.
- Alerts arrive quickly enough to be useful.
- False alerts are low enough that farmers do not ignore them.
- The farmer uses the app repeatedly.
- The farmer understands the physical emergency controls.
- The farmer would pay for the product and service.

The first product is successful when a farmer says:

> “I can sleep without guessing whether the brooder is working.”

## 19. Recommended next steps

1. Interview five farmers specifically about brooding problems.
2. Choose one certified electric infrared brooder for testing.
3. Find a qualified electrician and poultry equipment technician.
4. Request the supplier documents and controller API information.
5. Build a temperature-only monitoring prototype before adding remote control.
6. Test all failure states before installing near chicks.
7. Run one supervised farm pilot for 30 days.
8. Add gas support only with a certified gas-equipment partner.

Do not purchase large inventory or advertise remote heating control until the hardware, installation, safety process, and pilot results are proven.
