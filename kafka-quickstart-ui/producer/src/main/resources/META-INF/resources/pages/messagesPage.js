import {doPost, errorPopUp} from "../web/web.js";
import timestampToFormattedString from "../util/datetimeUtil.js";
import {createTableItem} from "../util/contentManagement.js";

const MODAL_KEY_TAB = "header-key-tab-pane";
const PAGE_SIZE = 20;

export default class MessagesPage {
    constructor(containerId) {
        this.containerId = containerId;
        this.registerButtonHandlers();
        this.pagesCache = new Map();
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

        $('.close-modal-btn').click(() => {
            $('#create-msg-modal').modal('hide');
            this.setActiveTab(MODAL_KEY_TAB);
        });

        $('#msg-page-sorting-select').multiselect({
            allSelectedText: 'All',
            includeSelectAllOption: true
        });

        // FIXME: should be disabled, when no previous page available;
        // TODO: add force reload button
        $(".previous").click(() => {
            window.currentContext.currentPage = window.currentContext.currentPage - 1;
            this.getPage(currentContext.currentPage, this.onMessagesLoaded, this.onMessagesFailed);
        })

        $(".next").click(() => {
            window.currentContext.currentPage = window.currentContext.currentPage + 1;
            this.getPage(currentContext.currentPage, this.onMessagesLoaded, this.onMessagesFailed);
        })
    }

    open(params) {
        const topicName = params[0];
        window.currentContext = {
            topicName: topicName,
            currentPage: 1 //always start with first page
        };

        this.requestPartitions(topicName, this.onPartitionsLoaded, this.onPartitionsFailed);
    }

    requestPartitions(topicName, onPartitionsLoaded, onPartitionsFailed) {
        const rq = {
            action: "getPartitions", topicName: topicName
        }

        doPost(rq, onPartitionsLoaded, onPartitionsFailed);
    }

    onPartitionsLoaded(data) {
        let msgModalPartitionSelect = $('#msg-modal-partition-select');
        let msgPagePartitionSelect = $('#msg-page-partition-select');
        msgModalPartitionSelect.empty();
        msgPagePartitionSelect.empty();

        msgModalPartitionSelect.append($("<option/>", {
            value: "any", text: "Any"
        }).attr("selected", "selected"));
        for (let partition of data) {
            msgModalPartitionSelect.append($("<option/>", {
                value: partition, text: partition
            }));
            msgPagePartitionSelect.append($("<option/>", {
                value: partition, text: partition
            }));
        }

        msgPagePartitionSelect.multiselect({
            allSelectedText: 'All',
            includeSelectAllOption: true
        })
            //TODO: when all unselected - check all and return data from all partitions
            .multiselect('selectAll', false)
            .multiselect('updateButtonText')
            .multiselect('rebuild');

        this.getPage(currentContext.currentPage, this.onMessagesLoaded, this.onMessagesFailed)
    }

    onPartitionsFailed(data, errorType, error) {
        errorPopUp("no partitions");
    }

    //TODO: clean cache, if different partitions selected? or make cache support different partitions combinations. List as key?
    getPage(pageNumber, onMessagesLoaded, onMessagesFailed) {
        if (this.pagesCache.has(pageNumber)) {
            const offset = this.pagesCache.get(pageNumber);
            return this.requestMessages(currentContext.topicName, pageNumber, offset, onMessagesLoaded, onMessagesFailed)
        }
        return this.requestPage(pageNumber, onMessagesLoaded, onMessagesFailed);
    }

    requestMessages(topicName, pageNumber, partitionOffset, onMessagesLoaded, onMessagesFailed) {
        const partitions = this.getPartitions();

        let order = $("#msg-page-sorting-select").val();

        const req = {
            action: "topicMessages",
            topicName: topicName,
            partitionOffset: partitionOffset,
            pageSize: 30, //FIXME: global? variable: pageSize
            pageNumber: pageNumber,
            order: order
        };

        doPost(req, onMessagesLoaded, onMessagesFailed);
    }

    getPartitions() {
        return $("#msg-page-partition-select").val().map((item) => {
            return parseInt(item, 10);
        });
    }

    requestPage(requestedPage, onPageLoaded, onPageLoadFailed) {
        const order = $("#msg-page-sorting-select").val();
        const topicName = currentContext.topicName;
        const partitions = this.getPartitions();
        const req = {
            action: "getPage",
            topicName: topicName,
            order: order,
            partitions: partitions,
            pageSize: 30, //FIXME
            pageNumber: requestedPage
        };

        doPost(req, onPageLoaded, onPageLoadFailed);
    }

    onMessagesLoaded(data) {
        this.pagesCache.set(currentContext.currentPage + 1, data.partitionOffset);

        const messages = data.messages;
        let msgTableBody = $('#msg-table-body');
        msgTableBody.empty();

        for (let i = 0; i < messages.length; i++) {
            let tableRow = $("<tr/>");
            tableRow.append(createTableItem(messages[i].offset));
            tableRow.append(createTableItem(messages[i].partition));
            tableRow.append(createTableItem(timestampToFormattedString(messages[i].timestamp)));
            tableRow.append(createTableItem(messages[i].key));
            // TODO: add expanding
            tableRow.append(createTableItem(messages[i].value));
            msgTableBody.append(tableRow);
        }

        currentContext.lastOffset = data.partitionOffset;
    }

    onMessagesFailed(data, errorType, error) {
        console.error("Error  getting topic messages");
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