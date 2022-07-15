import {doPost, errorPopUp} from "../web/web.js";
import {createPrimaryBtn, createTableItem, createTableItemHtml} from "../util/contentManagement.js";
import {pages} from "./navigator.js";

export default class TopicsPage {
    constructor(navigator, containerId) {
        this.navigator = navigator;
        this.containerId = containerId;
        this.registerButtonHandlers();

        // TODO: move to common function with comment
        Object.getOwnPropertyNames(TopicsPage.prototype).forEach((key) => {
            if (key !== 'constructor') {
                this[key] = this[key].bind(this);
            }
        });
    }

    registerButtonHandlers() {
        $("#create-topic-btn").click(() => {
            this.createTopic(this.onTopicsLoaded, this.onTopicsFailed);
            $('#create-topic-modal').modal('hide');
        })

        $("#open-create-topic-modal-btn").click(() => {
            $('#create-topic-modal').modal('show');
        });

        $('.close-modal-btn').click(() => {
            $('#create-topic-modal').modal('hide');
        });

    }

    open() {
        this.requestTopics(this.onTopicsLoaded, this.onTopicsFailed);
    }

    requestTopics(onTopicsLoaded, onTopicsFailed) {
        const req = {
            action: "getTopics", key: "0", value: "0"
        };
        doPost(req, onTopicsLoaded, onTopicsFailed);
    }

    onTopicsLoaded(data) {
        let tableBody = $('#topics-table tbody');
        tableBody.empty();

        for (let i = 0; i < data.length; i++) {
            let tableRow = $("<tr/>");
            let d = data[i];
            tableRow.append(createTableItem(d.name));
            tableRow.append(createTableItem(d.topicId));
            tableRow.append(createTableItem(d.partitionsCount));
            tableRow.append(createTableItem(("" + d.nmsg)));

            let deleteBtn = createPrimaryBtn("Delete", () => {
                this.deleteTopic(d.name, this.onTopicsLoaded, this.onTopicsFailed)
            });
            let messagesBtn = createPrimaryBtn("Messages", () => {
                self.navigator.navigateTo(pages.TOPIC_MESSAGES, [d.name]);
            });
            const controlHolder = $("<div/>")
                .append(messagesBtn)
                .append(deleteBtn);
            tableRow.append(createTableItemHtml(controlHolder));

            const self = this;

            tableBody.append(tableRow);
        }
    }

    onTopicsFailed(data) {
        errorPopUp("Error getting topics: ", data);
    }

    createTopic(onTopicsLoaded, onTopicsFailed) {
        const topicName = $("#topic-name-modal-input").val();
        const partitions = $("#partitions-modal-input").val();
        const replications = $("#replications-modal-input").val();

        const req = {
            action: "createTopic",
            topicName: topicName,
            partitions: partitions,
            replications: replications
        };
        doPost(req, () => this.requestTopics(this.onTopicsLoaded, this.onTopicsFailed), onTopicsFailed);
    }
    //TODO: add pagination here

    deleteTopic(topicName, onTopicsLoaded, onTopicsFailed) {
        const req = {
            action: "deleteTopic", key: topicName, value: "0"
        };
        doPost(req, onTopicsLoaded, onTopicsFailed);
    }
}