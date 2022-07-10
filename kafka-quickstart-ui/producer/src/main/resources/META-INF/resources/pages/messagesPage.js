import {doPost, errorPopUp} from "../web/web.js";
import timestampToFormattedString from "../util/datetimeUtil.js";
import {createTableItem, createTableItemHtml} from "../util/contentManagement.js";

const MODAL_KEY_TAB = "header-key-tab-pane";
const PAGE_SIZE = 10;

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
            this.getPage(currentContext.currentPage, this.onMessagesLoaded, this.onMessagesFailed);
            this.redrawPageNav();
        });

        $("#msg-page-partition-select").change(() => {
            window.currentContext.currentPage = 1;
            this.getPage(currentContext.currentPage, this.onMessagesLoaded, this.onMessagesFailed);
            this.redrawPageNav();

        });

        $(".previous").click(() => {
            if (window.currentContext.currentPage === 1) return;

            window.currentContext.currentPage = window.currentContext.currentPage - 1;
            this.getPage(currentContext.currentPage, this.onMessagesLoaded, this.onMessagesFailed);
            this.redrawPageNav();
        })

        $(".next").click(() => {
            if (window.currentContext.currentPage === currentContext.maxPageNumber) return;

            window.currentContext.currentPage = window.currentContext.currentPage + 1;
            this.getPage(currentContext.currentPage, this.onMessagesLoaded, this.onMessagesFailed);
            this.redrawPageNav();
        })

        $("#reload-msg-btn").click(() => {
            this.open([currentContext.topicName]);
            //TODO: show spinner
        });
    }

    open(params) {
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
            //TODO: when all unselected - check all and return data from all partitions
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
        this.loadMaxPageNumber();
    }

    onPartitionsFailed(data, errorType, error) {
        errorPopUp("no partitions");
    }

    //TODO: clean cache, if different partitions selected? or make cache support different partitions combinations. List as key?
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
            if (value.length < 50) {
                tableRow.append(createTableItem(value));
            } else {
                // FIXME: need to add an expand button + make each column take fixed width.
                // We need to create an expanding area, if message is too long.
                const wrapDiv = $("<div/>")
                    .addClass("d-flex")
                    .addClass("flex-row");

                const text = $("<p/>")
                    .text(value.slice(0, 50));
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

        this.setActiveTab(MODAL_KEY_TAB);
    }

    clearMessageTable() {
        $('#msg-table-body').empty();
    }

    redrawPageNav() {
        //TODO: add GOTO page input
        const currentPage = currentContext.currentPage;
        let pages;
        if (currentPage === 1) {
            pages = [currentPage, currentPage + 1, currentPage + 2];
            $(".previous").addClass("disabled");
            $(".next").removeClass("disabled");
        } else if (currentPage === currentContext.maxPageNumber) {
            pages = [currentPage - 2, currentPage - 1, currentPage];
            $(".previous").removeClass("disabled");
            $(".next").addClass("disabled");
        } else {
            pages = [currentPage - 1, currentPage, currentPage + 1];
            $(".previous").removeClass("disabled");
            $(".next").removeClass("disabled");
        }

        const pagination = $("#msg-pagination");

        // Remove all page children numbers.
        for (let i = 0; i < 3; i++) {
            pagination.children()[1].remove();
        }

        for (const p of pages) {
            let a = $("<a/>")
                .text("" + p)
                .addClass("page-link");
            let li = $("<li/>")
                .addClass("page-item")
                .click(() => {
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

    requestOffset(topicName, order, onOffsetLoaded, onOffsetFailed) {
        const req = {
            action: "getOffset",
            topicName: topicName,
            order: order,
            requestedPartitions: this.getPartitions()
        };
        doPost(req, onOffsetLoaded, onOffsetFailed);
    }

    loadMaxPageNumber() {
        this.requestOffset(
            currentContext.topicName,
            //TODO: extract constant for sorting directions
            "NEW_FIRST",
            (data) => {
                //TODO: UNIFY
                let totalElements = Object.values(data).reduce((partialSum, a) => partialSum + a, 0);
                window.currentContext.maxPageNumber = Math.ceil(totalElements / PAGE_SIZE);
                this.redrawPageNav();
            },
            (data, errorType, error) => {
                console.error("Error getting max page number.");
            }
        );
    }

    getOrder() {
        return $("#msg-page-sorting-select").val();
    }

}