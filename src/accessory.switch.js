const Platform = require("./platform");

const lodash = require("lodash");
const appletv = require("node-appletv-x");

module.exports = class SwitchAccessory {
    constructor(platform, config, device) {
        this.characteristics = require("./characteristics")(platform.api);

        this.type = "Switch";

        this.configureAccessory = this.configureAccessory.bind(this);
        this.configureServices = this.configureServices.bind(this);
        this.configureSwitchService = this.configureSwitchService.bind(this);

        this.setOn = this.setOn.bind(this);
        this.getOn = this.getOn.bind(this);
        this.setActive = this.setActive.bind(this);
        this.getActive = this.getActive.bind(this);
        this.togglePower = this.togglePower.bind(this);

        this.onDeviceMessage = this.onDeviceMessage.bind(this);
        this.onPowerUpdate = this.onPowerUpdate.bind(this);
        this.onNowPlaying = this.onNowPlaying.bind(this);

        this.log = this.log.bind(this);
        this.debug = this.debug.bind(this);

        this.platform = platform;
        this.config = config;
        this.device = device;

        this.on = false;
        this.active = this.platform.api.hap.Characteristic.Active.INACTIVE;

        this.configureAccessory();
    }

    debug(message) {
        this.platform.debug(`(${this.config.name} ${this.type}) ${message}`);
    }

    log(message) {
        this.platform.log(`(${this.config.name} ${this.type}) ${message}`);
    }

    configureAccessory() {
        try {
            this.debug(`configuring ${this.type} accessory.`);

            this.uid = this.platform.api.hap.uuid.generate(`${Platform.platformName}.${this.device.uid}.${this.type}`);
            this.instance = lodash.find(
                this.platform.accessories,
                (accessory) => {
                    this.log(accessory.context.uid + ":" + this.device.uid);
                    this.log(accessory.context.category + ":" + this.platform.api.hap.Categories.SWITCH);

                    return accessory.context.uid === this.device.uid.toLowerCase() && accessory.context.category === this.platform.api.hap.Categories.SWITCH;
                }
            );

            let update = true;

            if (!this.instance) {
                this.debug(`creating ${this.type} accessory.`);

                this.instance = new this.platform.api.platformAccessory(`${this.config.name} ${this.type}`, this.uid);
                this.platform.registerAccessory(this.instance);

                update = false;
            }

            this.instance.category = this.platform.api.hap.Categories.SWITCH;
            this.instance.displayName = `${this.config.name} ${this.type}`;
            this.instance.name = `${this.config.name} ${this.type}`;
            this.instance.context.category = this.platform.api.hap.Categories.SWITCH;
            this.instance.context.uid = this.device.uid.toLowerCase();
            this.instance.context.version = 2;

            if (update) {
                this.platform.updateAccessory(this.instance);
            }

            this.configureServices();

            this.device.on("message", this.onDeviceMessage);
            this.device.on("nowPlaying", this.onNowPlaying);

            this.log(this.instance.UUID);

            //this.device.sendIntroduction().then(this.onDeviceMessage);

            // this.deviceInfoTimer = setInterval(() => this.device.sendIntroduction().then(this.onDeviceMessage), 5000);

            this.log(`accessory configured.`);
        } catch (error) {
            this.log(`unable to configure accessory => ${error}`);
        }
    }

    configureServices() {
        try {
            this.debug(`configuring ${this.type} accessory information service.`);

            this.instance
                .getService(this.platform.api.hap.Service.AccessoryInformation)
                .setCharacteristic(this.platform.api.hap.Characteristic.Manufacturer, "Apple")
                .setCharacteristic(this.platform.api.hap.Characteristic.Model, "Apple TV")
                .setCharacteristic(this.platform.api.hap.Characteristic.SerialNumber, `SW${this.device.uid.substring(0, 5)}`)
                .setCharacteristic(this.platform.api.hap.Characteristic.Name, `${this.config.name} ${this.type}`);

            this.configureSwitchService();

            this.log(`${this.type} accessory information service configured.`);
        } catch (error) {
            this.log(`unable to configure accessory information service => ${error}`);
        }
    }

    configureSwitchService() {
        try {
            this.debug(`configuring switch service.`);

            this.service = this.instance.getService(this.platform.api.hap.Service.Switch);

            if (!this.service) {
                this.debug(`creating switch service.`);

                this.service = this.instance.addService(this.platform.api.hap.Service.Switch, `${this.config.name} Switch`, `${this.uid}_switch`);
            }

            this.service.getCharacteristic(this.platform.api.hap.Characteristic.On).on("get", this.getOn).on("set", this.setOn);

            this.log(`switch service configured.`);
        } catch (error) {
            this.log(`unable to configure switch service => ${error}`);
        }
    }

    async togglePower(value, callback) {
        try {
            clearInterval(this.deviceInfoTimer);

            this.debug(`toggle power => ${value ? "on" : "off"}.`);

            if (!value && this.power) {
                await this.device.sendKeyCommand(appletv.AppleTV.Key.LongTv);
                await this.device.sendKeyCommand(appletv.AppleTV.Key.Select);

                this.onPowerUpdate && this.onPowerUpdate(value);
                this.power = value;
            } else if (value && !this.power) {
                await this.device.sendKeyPressAndRelease(1, 0x83);
                await this.device.sendKeyCommand(appletv.AppleTV.Key.Tv);
                await this.device.sendKeyCommand(appletv.AppleTV.Key.Tv);

                this.onPowerUpdate && this.onPowerUpdate(value);
                this.power = value;
            }

            setTimeout(() => callback(), 5000);

            this.deviceInfoTimer = setInterval(() => this.device.sendIntroduction().then(this.onDeviceMessage), 5000);
        } catch (error) {
            this.log(`unable to toggle power status => ${error}`);
        }
    }

    setOn(value, callback) {
        try {
            this.debug(`setting on status => ${value}`);

            this.on = value;

            this.togglePower(!!this.on, () => callback(null));
        } catch (error) {
            this.log(`unable to set on status => ${error}`);
        }
    }

    getOn(callback) {
        this.debug(`requesting on status => ${this.on}`);

        callback(null, this.on);
    }

    setActive(value, callback) {
        this.debug(`setting active status => ${value}`);

        this.active = !!value ? this.platform.api.hap.Characteristic.Active.ACTIVE : this.platform.api.hap.Characteristic.Active.INACTIVE;

        callback(null);
    }

    getActive(callback) {
        this.debug(`requesting active status => ${this.active}`);

        callback(null, this.active);
    }

    onPowerUpdate(value) {
        try {
            this.on = !!value;
            this.service.getCharacteristic(this.platform.api.hap.Characteristic.On).updateValue(this.on);
        } catch (error) {
            this.log(`unable to update power status => ${error}`);
        }
    }

    onNowPlaying(message) {
        try {
            if (message && message.playbackState && message.playbackState.length > 1) {
                message.playbackState = message.playbackState[0].toUpperCase() + message.playbackState.substring(1).toLowerCase();
            }

            this.service.getCharacteristic(this.characteristics.State).updateValue(message && message.playbackState ? message.playbackState : "-");
            this.service.getCharacteristic(this.characteristics.Type).updateValue(message ? (message.album && message.artist ? "Music" : "Video") : "-");
            this.service.getCharacteristic(this.characteristics.Title).updateValue(message && message.title ? message.title : "-");
            this.service.getCharacteristic(this.characteristics.Artist).updateValue(message && message.artist ? message.artist : "-");
            this.service.getCharacteristic(this.characteristics.Album).updateValue(message && message.album ? message.album : "-");
            this.service.getCharacteristic(this.characteristics.Application).updateValue(message && message.appDisplayName ? message.appDisplayName : "-");
            this.service.getCharacteristic(this.characteristics.ApplicationBundleId).updateValue(message && message.appBundleIdentifier ? message.appBundleIdentifier : "-");
            this.service.getCharacteristic(this.characteristics.ElapsedTime).updateValue(message && message.elapsedTime > 0 ? Math.round(message.elapsedTime) : "-");
            this.service.getCharacteristic(this.characteristics.Duration).updateValue(message && message.duration > 0 ? Math.round(message.duration) : "-");
            this.service.getCharacteristic(this.platform.api.hap.Characteristic.Active).updateValue(message && message.playbackState === "Playing");
        } catch (error) {
            this.log(`unable to update now playing status => ${error}`);
        }
    }

    onDeviceMessage(message) {
        try {
            if (message.payload) {
                let power = false;

                if (message.payload.logicalDeviceCount > 0 && (!message.payload.isProxyGroupPlayer || message.payload.isAirplayActive)) {
                    power = true;
                }

                if (this.power === power) {
                    return;
                }

                this.power = power;

                this.onPowerUpdate && this.onPowerUpdate(this.power);

                this.debug(`power status update => ${this.power ? "on" : "off"}.`);
            }
        } catch (error) {
            this.log(`unable to update power status => ${error}`);
        }
    }
};
