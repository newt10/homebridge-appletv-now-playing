const lodash = require("lodash");
const Accessory = require("./accessory");

module.exports = class TelevisionAccessory extends Accessory {
    static Type = "Television";

    constructor(platform, config, device) {
        super(TelevisionAccessory.Type, platform, config, device);

        this.createAccessory = this.createAccessory.bind(this);
        this.updateAccessory = this.updateAccessory.bind(this);

        this.configureServices = this.configureServices.bind(this);
        this.configureTelevisionService = this.configureTelevisionService.bind(this);
        this.configureInputServices = this.configureInputServices.bind(this);

        this.setRemote = this.setRemote.bind(this);
        this.setActive = this.setActive.bind(this);
        this.getActive = this.getActive.bind(this);
        this.setActiveIdentifier = this.setActiveIdentifier.bind(this);
        this.getActiveIdentifier = this.getActiveIdentifier.bind(this);

        this.onPowerUpdate = this.onPowerUpdate.bind(this);
        this.onNowPlaying = this.onNowPlaying.bind(this);

        this.active = false;
        this.activeIdentifier = 0;

        this.configureServices();

        this.instance.category = this.platform.api.hap.Categories.TELEVISION;
        this.device.on("nowPlaying", this.onNowPlaying);
    }

    createAccessory() {
        this.platform.publishExternalAccessory(this.instance);
    }

    updateAccessory() {
        //this.platform.updateAccessory(this.instance);
        this.platform.publishExternalAccessory(this.instance);
    }

    configureServices() {
        super.configureServices();
        this.configureTelevisionService();
    }

    configureTelevisionService() {
        try {
            super.debug(`configuring television service.`);

            this.service = this.instance.getService(this.platform.api.hap.Service.Television);

            if (!this.service) {
                super.debug(`creating television service.`);

                this.service = this.instance.addService(this.platform.api.hap.Service.Television, `${this.config.name} Television`, `${this.uid}_television`);
            }

            this.service.getCharacteristic(this.platform.api.hap.Characteristic.Active).on("get", this.getActive).on("set", this.setActive);
            this.service.getCharacteristic(this.platform.api.hap.Characteristic.ActiveIdentifier).on("get", this.getActiveIdentifier).on("set", this.setActiveIdentifier);
            this.service.getCharacteristic(this.platform.api.hap.Characteristic.RemoteKey).on("set", this.setRemote);

            this.service.setCharacteristic(this.platform.api.hap.Characteristic.ConfiguredName, `${this.config.name} Television`);
            this.service.setCharacteristic(this.platform.api.hap.Characteristic.SleepDiscoveryMode, this.platform.api.hap.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);

            this.configureInputServices();

            super.log(`television service configured.`);
        } catch (error) {
            super.log(`unable to configure television service => ${error}`);
        }
    }

    configureInputServices() {
        try {
            super.debug(`configuring input services.`);

            if (this.instance.context.inputs && this.config.inputs.length < this.instance.context.inputs.length) {
                for (let index = this.config.inputs.length; index < this.instance.context.inputs.length; index++) {
                    let inputService = this.instance.getServiceByUUIDAndSubType(this.platform.api.hap.Service.InputSource, `${this.device.uid}_apple_tv_input_${index}`);

                    if (inputService) {
                        super.debug(`removing input service => ${index}.`);

                        this.service.removeLinkedService(inputService);
                        this.instance.removeService(inputService);
                    }
                }
            }

            lodash.each(this.config.inputs, (input, index) => {
                try {
                    super.debug(`configuring input service => ${input.name}.`);

                    let inputService = this.instance.getServiceByUUIDAndSubType(this.platform.api.hap.Service.InputSource, `${this.device.uid}_apple_tv_input_${index}`);

                    if (!inputService) {
                        super.debug(`creating input service => ${input.name}.`);

                        inputService = new this.platform.api.hap.Service.InputSource(input.name, `${this.device.uid}_apple_tv_input_${index}`);

                        this.service.addLinkedService(inputService);
                        this.instance.addService(inputService, true);
                    }

                    input.identifier = index;

                    inputService
                        .setCharacteristic(this.platform.api.hap.Characteristic.Identifier, index)
                        .setCharacteristic(this.platform.api.hap.Characteristic.IsConfigured, this.platform.api.hap.Characteristic.IsConfigured.CONFIGURED)
                        .setCharacteristic(this.platform.api.hap.Characteristic.InputSourceType, this.platform.api.hap.Characteristic.InputSourceType.APPLICATION)
                        .setCharacteristic(this.platform.api.hap.Characteristic.Name, input.name)
                        .setCharacteristic(this.platform.api.hap.Characteristic.ConfiguredName, input.name)
                        .setCharacteristic(this.platform.api.hap.Characteristic.CurrentVisibilityState, this.platform.api.hap.Characteristic.CurrentVisibilityState.SHOWN);

                    super.log(`input service configured => ${input.name}.`);
                } catch (error) {
                    super.log(`unable create input service => ${input.name} => ${error}`);
                }
            });

            this.instance.context.inputs = this.config.inputs;

            super.log(`input services configured.`);
        } catch (error) {
            super.log(`unable to configure input service => ${error}`);
        }
    }

    setRemote(value, callback) {
        super.debug(`setting remote status => ${!!value}`);

        callback(null);
    }

    setActive(value, callback) {
        super.debug(`setting active status => ${value}`);

        this.active = value;

        super.togglePower(!!this.active, () => callback(null));
    }

    getActive(callback) {
        super.debug(`requesting active status => ${this.active}`);

        callback(null, this.active);
    }

    async setActiveIdentifier(value, callback) {
        try {
            super.debug(`setting active identifier status => ${value}`);

            if (this.activeIdentifier && this.activeIdentifier == value) return;

            this.activeIdentifier = value;

            let input = this.config.inputs[this.activeIdentifier];

            this.platform.debug(`switching to input => ${input.name}.`);

            let column = input.index % 5;
            let row = (input.index - column) / 5;

            await this.device.sendKeyCommand(appletv.AppleTV.Key.Tv);

            setTimeout(async () => {
                await this.device.sendKeyCommand(appletv.AppleTV.Key.Tv);

                setTimeout(async () => {
                    for (let i = 0; i < column - 1; i++) {
                        await this.device.sendKeyCommand(appletv.AppleTV.Key.Right);
                    }

                    for (let i = 0; i < row; i++) {
                        await this.device.sendKeyCommand(appletv.AppleTV.Key.Down);
                    }

                    await this.device.sendKeyCommand(appletv.AppleTV.Key.Select);

                    callback(null);
                }, 1000);
            }, 2000);
        } catch (error) {
            super.log(`unable to set active identifier status => ${error}`);
        }
    }

    getActiveIdentifier(callback) {
        super.debug(`requesting active identifier status => ${this.activeIdentifier}`);

        callback(null, this.activeIdentifier);
    }

    onPowerUpdate(value) {
        try {
            this.active = !!value ? this.platform.api.hap.Characteristic.Active.ACTIVE : this.platform.api.hap.Characteristic.Active.INACTIVE;
            this.service.getCharacteristic(this.platform.api.hap.Characteristic.Active).updateValue(this.active);
        } catch (error) {
            super.log(`unable to update power status => ${error}`);
        }
    }

    onNowPlaying(message) {
        try {
            if (message && message.playbackState && message.playbackState.length > 1) {
                message.playbackState = message.playbackState[0].toUpperCase() + message.playbackState.substring(1).toLowerCase();
            }

            if (message && message.appBundleIdentifier && this.config.inputs) {
                let input = this.config.inputs.filter((input) => input.applicationId && input.applicationId === message.appBundleIdentifier);

                if (input && input.length) {
                    input = input[0];

                    this.debug(`switching to input => ${input.name}.`);

                    this.input = input;
                    this.service.getCharacteristic(this.platform.api.hap.Characteristic.ActiveIdentifier).updateValue(this.input.identifier);
                }
            }

            this.service
                .getCharacteristic(this.platform.api.hap.Characteristic.CurrentMediaState)
                .updateValue(
                    message && message.playbackState
                        ? message.playbackState === "playing"
                            ? this.platform.api.hap.Characteristic.CurrentMediaState.PLAY
                            : message.playbackState === "paused"
                            ? this.platform.api.hap.Characteristic.CurrentMediaState.PAUSE
                            : this.platform.api.hap.Characteristic.CurrentMediaState.STOP
                        : this.platform.api.hap.Characteristic.CurrentMediaState.STOP
                );
        } catch (error) {
            super.log(`unable to update now playing status => ${error}`);
        }
    }
};
