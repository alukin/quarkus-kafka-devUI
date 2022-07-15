import {doPost, errorPopUp} from "../web/web.js";
import timestampToFormattedString from "../util/datetimeUtil.js";
import {createTableItem, createTableItemHtml} from "../util/contentManagement.js";
import {toggleSpinner} from "../util/spinner.js";

const MODAL_KEY_TAB = "header-key-tab-pane";
const PAGE_SIZE = 10;
const NEW_FIRST = "NEW_FIRST";
const OLD_FIRST = "OLD_FIRST";
const MESSAGES_SPINNER = "message-load-spinner";
const MESSAGES_TABLE = "msg-table-holder";

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

        $('.close-modal-btn').click(() => {
            $('#create-msg-modal').modal('hide');
            this.setActiveTab(MODAL_KEY_TAB);
        });

        $('#msg-page-sorting-select').multiselect({});

        $('#msg-page-partition-select').multiselect({
            includeSelectAllOption: true
        });

        $("#msg-page-sorting-select").change(() => {
            window.currentContext.currentPage = 1;
            this.loadMessages();
        });

        $("#msg-page-partition-select").change(() => {
            window.currentContext.currentPage = 1;
            this.loadMessages();
        });

        $(".previous").click(() => {
            if (window.currentContext.currentPage === 1) return;
            window.currentContext.currentPage = window.currentContext.currentPage - 1;
            this.loadMessages();
        })

        $(".next").click(() => {
            if (window.currentContext.currentPage === this.getMaxPageNumber()) return;
            window.currentContext.currentPage = window.currentContext.currentPage + 1;
            this.loadMessages();
        })

        $("#reload-msg-btn").click(() => {
            currentContext.pagesCache = new Map();
            this.loadMessages();
        });
    }

    loadMessages() {
        toggleSpinner(MESSAGES_TABLE, MESSAGES_SPINNER);
        this.getPage(currentContext.currentPage, this.onMessagesLoaded, this.onMessagesFailed);
        this.redrawPageNav();
    }

    open(params) {
        toggleSpinner(MESSAGES_TABLE, MESSAGES_SPINNER);
        const topicName = params[0];
        window.currentContext = {
            topicName: topicName,
            currentPage: 1, //always start with first page
            pagesCache: new Map()
        };

        this.clearMessageTable();
        this.requestPartitions(topicName, this.onPartitionsLoaded, this.onPartitionsFailed);
    }

    // Key format: ORDER-partition1-partition2-...-partitionN-pageNumber. Like: NEW_FIRST-0-1-17
    generateCacheKey(pageNumber) {
        const order = this.getOrder();
        const partitions = this.getPartitions();
        const partitionsKeyPart = partitions.reduce((partialKey, str) => partialKey + "-" + str, 0);

        return order + partitionsKeyPart + "-" + pageNumber;
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
            .multiselect('selectAll', false)
            .multiselect('updateButtonText')
            .multiselect('rebuild');


        // As we want first page to get cached too, so request that offset, apparently.
        if (currentContext.currentPage === 1) {
            this.requestOffset(currentContext.topicName, this.getOrder(),
                (data) => currentContext.pagesCache.set(this.generateCacheKey(1), data),
                (data, errorType, error) => {
                    errorPopUp("Could not get first page offset.")
                });
        }

        this.getPage(currentContext.currentPage, this.onMessagesLoaded, this.onMessagesFailed);
        this.loadMaxPageNumber(() => {
        }, () => {
        });
    }

    onPartitionsFailed(data, errorType, error) {
        errorPopUp("no partitions");
    }

    getPage(pageNumber, onMessagesLoaded, onMessagesFailed) {
        const key = this.generateCacheKey(pageNumber);
        if (currentContext.pagesCache.has(key)) {
            const offset = currentContext.pagesCache.get(key);
            return this.requestMessages(currentContext.topicName, pageNumber, offset, onMessagesLoaded, onMessagesFailed)
        }

        return this.requestOffset(currentContext.topicName, this.getOrder(), (data) => {
            this.requestMessages(currentContext.topicName, currentContext.currentPage, data, onMessagesLoaded, onMessagesFailed);
        }, (data, errorType, error) => errorPopUp("Could not load messages."));
    }

    requestMessages(topicName, pageNumber, partitionOffset, onMessagesLoaded, onMessagesFailed) {
        const req = {
            action: "topicMessages",
            topicName: topicName,
            partitionOffset: partitionOffset,
            pageSize: PAGE_SIZE,
            pageNumber: pageNumber,
            order: this.getOrder()
        };

        doPost(req, onMessagesLoaded, onMessagesFailed);
    }

    getPartitions() {
        return $("#msg-page-partition-select").val().map((item) => {
            return parseInt(item, 10);
        });
    }

    requestPage(requestedPage, onPageLoaded, onPageLoadFailed) {
        const topicName = currentContext.topicName;
        const partitions = this.getPartitions();
        const req = {
            action: "getPage",
            topicName: topicName,
            order: this.getOrder(),
            partitions: partitions,
            pageSize: PAGE_SIZE,
            pageNumber: requestedPage
        };

        doPost(req, onPageLoaded, onPageLoadFailed);
    }

    onMessagesLoaded(data) {
        const key = this.generateCacheKey(currentContext.currentPage + 1);
        currentContext.pagesCache.set(key, data.partitionOffset);

        const messages = data.messages;
        this.clearMessageTable();

        let msgTableBody = $('#msg-table-body');

        for (let i = 0; i < messages.length; i++) {
            let tableRow = $("<tr/>");
            tableRow.append(createTableItem(messages[i].offset));
            tableRow.append(createTableItem(messages[i].partition));
            tableRow.append(createTableItem(timestampToFormattedString(messages[i].timestamp)));
            tableRow.append(createTableItem(messages[i].key));

            const value = messages[i].value;
            const maxMsgLength = 75;
            if (value.length < maxMsgLength) {
                tableRow.append(createTableItem(value));
            } else {
                // FIXME: need to add an expand button + make each column take fixed width.
                // We need to create an expanding area, if message is too long.
                const wrapDiv = $("<div/>")
                    .addClass("d-flex")
                    .addClass("flex-row");

                const text = $("<p/>")
                    .text(value.slice(0, maxMsgLength));
                const dots = $("<span/>")
                    .addClass("text-shown")
                    .addClass("dots")
                    .text("...");
                const hiddenText = $("<span/>")
                    .addClass("hidden")
                    .addClass("hidden-text")
                    .text(value.slice(50, value.length));
                text.append(dots)
                    .append(hiddenText);
                wrapDiv.append(text);
                const td = createTableItemHtml(text)
                    .click(this.toggleContent());
                tableRow.append(td);
            }
            msgTableBody.append(tableRow);
        }

        currentContext.lastOffset = data.partitionOffset;
        toggleSpinner(MESSAGES_TABLE, MESSAGES_SPINNER);
    }

    toggleContent() {
        return (event) => {
            const textBlock = $(event.target);
            const dots = textBlock.find(".dots");
            const hiddenText = textBlock.find(".hidden-text");

            if (dots.hasClass("hidden")) {
                dots.removeClass("hidden");
                dots.addClass("text-shown");
                hiddenText.removeClass("text-shown");
                hiddenText.addClass("hidden");
            } else {
                dots.removeClass("text-shown");
                dots.addClass("hidden");
                hiddenText.removeClass("hidden");
                hiddenText.addClass("text-shown");
            }
        };
    }

    onMessagesFailed(data, errorType, error) {
        console.error("Error getting topic messages");
    }

    requestCreateMessage() {
        const topicName = currentContext.topicName;
        let partition = $('#msg-modal-partition-select option:selected').val();
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

        // TODO: print out partitions count on topics page
        doPost(rq, data => {
            currentContext.pagesCache = new Map();
            new Promise(this.loadMaxPageNumber)
                .then(this.loadMessages)
                .catch(() => errorPopUp("Failed"));
        }, (data, errorType, error) => {
            errorPopUp("Failed to reload messages.");
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

        this.setActiveTab(MODAL_KEY_TAB);
    }

    clearMessageTable() {
        $('#msg-table-body').empty();
    }

    redrawPageNav() {
        //TODO: add GOTO page input
        const previous = $(".previous");
        const next = $(".next");

        previous.removeClass("disabled");
        next.removeClass("disabled");

        const maxPageNumber = this.getMaxPageNumber();
        const currentPage = currentContext.currentPage;
        let pages = [currentPage];

        if (currentPage > 1) {
            pages.unshift(currentPage - 1);
        }
        if (currentPage < maxPageNumber) {
            pages.push(currentPage + 1);
        }

        if (currentPage === 1) {
            previous.addClass("disabled");
            if (maxPageNumber > 2) {
                pages.push(currentPage + 2);
            }
        }
        if (currentPage === maxPageNumber) {
            next.addClass("disabled");
            if (maxPageNumber > 2) {
                pages.unshift(currentPage - 2);
            }
        }

        const pagination = $("#msg-pagination");

        // Remove all page children numbers.
        while (pagination.children().length !== 2) {
            pagination.children()[1].remove();
        }

        for (const p of pages) {
            let a = $("<a/>")
                .text("" + p)
                .addClass("page-link");
            let li = $("<li/>")
                .addClass("page-item")
                .click(() => {
                    toggleSpinner(MESSAGES_TABLE, MESSAGES_SPINNER);
                    currentContext.currentPage = p;
                    this.getPage(p, this.onMessagesLoaded, this.onMessagesFailed);
                    this.redrawPageNav();
                });

            if (p === currentPage) {
                li.addClass("active");
            }
            li.append(a);

            const lastPosition = pagination.children().length - 1;
            li.insertBefore(".next");
        }
    }

    requestOffset(topicName, order, onOffsetLoaded, onOffsetFailed, partitions) {
        const req = {
            action: "getOffset",
            topicName: topicName,
            order: order,
            requestedPartitions: partitions === undefined ? this.getPartitions() : partitions
        };
        doPost(req, onOffsetLoaded, onOffsetFailed);
    }

    // TODO: add possibility to hide panel on the left
    loadMaxPageNumber(resolve, reject) {
        const partitions = $("#msg-page-partition-select")
            .find("option")
            .toArray()
            .map(item => parseInt(item.value));
        this.requestOffset(
            currentContext.topicName,
            NEW_FIRST,
            (data) => {
                currentContext.partitionOffset = new Map(
                    Object.entries(data).map(x => [parseInt(x[0]), x[1]])
                );
                this.redrawPageNav();
                resolve();
            },
            (data, errorType, error) => {
                console.error("Error getting max page number.");
                reject();
            },
            partitions
        );
    }

    getMaxPageNumber() {
        const partitions = this.getPartitions();
        const totalElements = partitions.map(x => {
            const a = currentContext.partitionOffset.get(x)
            console.log(a);
            return a;
        })
            .reduce((partialSum, a) => partialSum + a, 0);
        return Math.max(Math.ceil(totalElements / PAGE_SIZE), 1);
    }

    getOrder() {
        return $("#msg-page-sorting-select").val();
    }

}