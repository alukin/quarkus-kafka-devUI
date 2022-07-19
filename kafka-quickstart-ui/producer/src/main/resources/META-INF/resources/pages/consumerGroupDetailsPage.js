import {createTableHead, createTableItem, createTableItemHtml} from "../util/contentManagement.js";

export default class ConsumerGroupDetailsPage {
    constructor(containerId) {
        this.containerId = containerId;
        Object.getOwnPropertyNames(ConsumerGroupDetailsPage.prototype).forEach((key) => {
            if (key !== 'constructor') {
                this[key] = this[key].bind(this);
            }
        });
    }

    open(params) {
        const membersData = params[1];
        let consumerGroupsTable = $('#consumer-group-details-table tbody');
        consumerGroupsTable.empty();
        for (let i = 0; i < membersData.length; i++) {
            const d = membersData[i];
            const groupId = "group-" + window.crypto.randomUUID();

            let tableRow = $("<tr/>");

            if (d.partitions.length > 0) {
                const arrowIcon = $("<i/>")
                    .addClass("bi")
                    .addClass("bi-chevron-right")
                    .addClass("rotate-icon");
                const arrowHolder = $("<div/>")
                    .addClass("d-flex")
                    .addClass("justify-content-center")
                    .append(arrowIcon);

                tableRow
                    .addClass("pointer")
                    .click(() => {
                        $("#" + groupId).toggle();
                        if (arrowHolder.hasClass("icon-rotated")) {
                            arrowHolder.removeClass("icon-rotated");
                        } else {
                            arrowHolder.addClass("icon-rotated");
                        }
                    })
                tableRow.append(createTableItemHtml(arrowHolder));
            } else {
                tableRow.append(createTableItem(""));
            }

            const memberId = $("<b/>")
                .text(d.clientId);
            const id = d.memberId.substring(d.clientId.length);
            const text = $("<p/>")
                .append(memberId)
                .append(id);
            tableRow.append(createTableItemHtml(text));
            tableRow.append(createTableItem(d.host));
            tableRow.append(createTableItem("" + new Set(d.partitions.map(x => x.partition)).size));
            tableRow.append(createTableItem("" + d.partitions.map(x => x.lag).reduce((l, r) => l + r, 0)));
            consumerGroupsTable.append(tableRow);

            if (d.partitions.length > 0) {
                const collapseInfo = $("<tr/>")
                    .attr("id", groupId)
                    .addClass("collapse");

                const collapseContent = $("<table/>")
                    .addClass("table")
                    .addClass("table-sm")
                    .addClass("no-hover");

                const headers = $("<tr/>")
                    .addClass("no-hover")
                    .append(createTableHead("Topic"))
                    .append(createTableHead("Partition"))
                    .append(createTableHead("Lag"));
                const head = $("<thead/>")
                    .append(headers);

                const body = $("<tbody/>");
                for (let partition of d.partitions) {
                    const row = $("<tr/>")
                        .addClass("no-hover");
                    row.append(createTableItemHtml(partition.topic))
                    row.append(createTableItemHtml(partition.partition))
                    row.append(createTableItemHtml(partition.lag))
                    body.append(row);
                }

                collapseContent.append(head);
                collapseContent.append(body);

                collapseInfo.append(createTableItemHtml(collapseContent)
                    .addClass("no-hover")
                    .attr("colspan", tableRow.children().length)
                );
                consumerGroupsTable.append(collapseInfo);
            }
        }
    }

}