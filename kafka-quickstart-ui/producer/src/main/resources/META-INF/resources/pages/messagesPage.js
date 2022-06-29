import {doPost, errorPopUp} from "../web/web.js";
import timestampToFormattedString from "../util/datetimeUtil.js";
import {createTableItem} from "../util/contentManagement.js";

const MODAL_KEY_TAB = "header-key-tab-pane";

export default class MessagesPage {
    constructor(containerId) {
        this.containerId = containerId;
        this.registerButtonHandlers();
        Object.getOwnPropertyNames(MessagesPage.prototype).forEach((key) => {
            if (key !== 'constructor') {
                this[key] = this[key].bind(this);
            }
        });
    }

    registerButtonHandlers() {
        $("#publish-msg-modal-btn").click(() => {
            $('#create-msg-modal').modal('show');
            this.setActiveTab(MODAL_KEY_TAB);
        });

        $('#send-msg-btn').click(this.createMessage.bind(this));

        $('.close-modal-btn').click(()=>{
            $('#create-msg-modal').modal('hide');
            this.setActiveTab(MODAL_KEY_TAB);
        });
    }

    open(params) {
        const topicName = params[0];
        window.currentContext = {
            topicName: topicName
        };

        this.requestMessages(topicName, this.onMessagesLoaded, this.onMessagesFailed);
        this.requestPartitions(topicName, this.onPartitionsLoaded, this.onPartitionsFailed);
    }

    requestMessages(topicName, onMessagesLoaded, onMessagesFailed) {
        let partition = $("partition-dropdown").val();

        if (partition === 'All') partition = null;
        const req = {
            action: "topicMessages", key: topicName, offset: 0, partition: partition
        };

        doPost(req, onMessagesLoaded, onMessagesFailed);
    }

    requestPartitions(topicName, onPartitionsLoaded, onPartitionsFailed) {
        const rq = {
            action: "getPartitions", topicName: topicName
        }

        doPost(rq, onPartitionsLoaded, onPartitionsFailed);
    }

    onMessagesLoaded(data) {
        let msgTableBody = $('#msg-table-body');
        msgTableBody.empty();

        for (let i = 0; i < data.length; i++) {
            let tableRow = $("<tr/>");
            tableRow.append(createTableItem(data[i].offset));
            tableRow.append(createTableItem(data[i].partition));
            tableRow.append(createTableItem(timestampToFormattedString(data[i].timestamp)));
            tableRow.append(createTableItem(data[i].key));
            // TODO: add expanding
            tableRow.append(createTableItem(data[i].value));
            msgTableBody.append(tableRow);
        }
    }

    onMessagesFailed(data, errorType, error) {
        console.error("Error  getting topic messages");
    }

    onPartitionsLoaded(data) {
        let partitionObject = $('#partition-select');
        partitionObject.empty();

        partitionObject.append($("<option/>", {
            value: "any", text: "Any"
        }).attr("selected", "selected"));
        for (let partition of data) {
            partitionObject.append($("<option/>", {
                value: partition, text: partition
            }));
        }
    }

    onPartitionsFailed(data, errorType, error) {
        errorPopUp("no partitions");
    }

    requestCreateMessage() {
        const topicName = currentContext.topicName;
        let partition = $('#partition-select option:selected').val();
        if (partition === 'any') partition = null;

        let valueTextarea = $('#msg-value-textarea');
        let keyTextarea = $('#msg-key-textarea');
        const rq = {
            action: "createMessage",
            topic: topicName,
            partition: partition,
            value: valueTextarea.val(),
            key: keyTextarea.val()
        };

        // let self = this;
        doPost(rq, data => {
            this.open([currentContext.topicName]);
        }, (data, errorType, error) => {
            errorPopUp("Failed to reload messsages.");
        });
    }

    setActiveTab(tab) {
        $('.nav-tabs button[href="#' + tab + '"]').click();
    };

    createMessage() {
        this.requestCreateMessage();

        // Clean inputs for future reuse of modal.
        $('#create-msg-modal').modal('hide');
        $('#msg-value-textarea').val("");
        $('#msg-key-textarea').val("");

        $('body').removeClass('modal-open');
        $('.modal-backdrop').remove();

        // TODO: make active value tab
        this.setActiveTab(MODAL_KEY_TAB);
    }
}