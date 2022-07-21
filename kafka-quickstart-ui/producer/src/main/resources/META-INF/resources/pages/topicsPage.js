import {doPost, errorPopUp} from "../web/web.js";
import {createIcon, createTableItem, createTableItemHtml} from "../util/contentManagement.js";
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
            $('.modal').modal('hide');
        });

        $("#delete-topic-btn").click(() => {
            const currentTopic = window.currentContext.topicName;
            this.deleteTopic(currentTopic, this.deleteTopicRow, this.onTopicsFailed)
            $("#delete-topic-modal").modal("hide");
        });
    }

    open() {
        window.currentContext = {};
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

            const deleteIcon = createIcon("bi-trash-fill");
            const deleteBtn = $("<btn/>")
                .addClass("btn")
                .click((event) => {
                    window.currentContext.topicName = d.name;
                    $("#delete-topic-modal").modal("show");
                    $("#delete-topic-name-span").text(d.name);
                    event.stopPropagation();
                })
                .append(deleteIcon);


            tableRow.click(() => {
                self.navigator.navigateTo(pages.TOPIC_MESSAGES, [d.name]);
            });
            const controlHolder = $("<div/>")
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

    // TODO: add pagination here
    deleteTopic(topicName, onTopicsDeleted, onTopicsFailed) {
        const req = {
            action: "deleteTopic",
            key: topicName
        };
        doPost(req, onTopicsDeleted, onTopicsFailed);
    }

    deleteTopicRow(data) {
        const topicName = window.currentContext.topicName;
        $("#topics-table > tbody > tr > td:contains('" + topicName + "')").parent().remove()
    }
}