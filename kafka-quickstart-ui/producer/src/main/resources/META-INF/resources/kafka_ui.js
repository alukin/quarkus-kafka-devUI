function doPost(data, successCallback, errorCallback) {
    $.ajax({
        url: 'kafka-admin',
        type: 'POST',
        data: JSON.stringify(data),
        contentType: "application/json; charset=utf-8",
        dataType: 'json',
        success: successCallback,
        error: errorCallback
    });
}

class Page {
    constructor(size, page) {
        this.size = size;
        this.page = page;
    }
}

function createTopic() {
    const topicName = document.getElementById("create_topic").value;
    const req = {
        action: "createTopic",
        key: topicName,
        value: "0",
        test: "1"
    };
    doPost(req,
            function (data) {
                updateTopics(data);
                console.log("Topic created: " + topicName);
            },
            function (data) {
                errorPopUp("Error creating topic:", data);
            }
    )
}

function deleteTopic(topicName) {
    var req = {
        action: "deleteTopic",
        key: topicName,
        value: "0"
    };
    doPost(req,
            function (data) {
                updateTopics(data);
                console.log("Topic deleted: " + topicName);

            },
            function (data) {
                errorPopUp("Error deleting topic:", data);

            }
    );
}

function getTopics() {
    var req = {
        action: "getTopics",
        key: "0",
        value: "0"
    };
    doPost(req,
            function (data) {
                updateTopics(data);
            },
            function (data) {
                errorPopUp("Error getting topics: ", data);
            }
    );
}

function getKafkaInfo() {
    const req = {
        action: "getInfo",
        key: "0",
        value: "0"
    };
    doPost(req,
            function (data) {
                updateInfo(data);
                updateConsumerGroups(data.consumerGroups);
            },
            function (data) {
                errorPopUp("Error getting Kafka info: ", data);
            }
    );
}

function updateTopics(data) {
    var content = '';
    for (var i = 0; i < data.length; i++) {
        var d = data[i];
        content += '<tr id=ttr-"' + d.name + '"</tr>';
        content += '<td>' + data[i].name + '</td>';
        content += '<td>' + data[i].topicId + '</td>';
        content += '<td>' + data[i].nmgs + '</td>';
        content += '<td><button type="button" class="btn btn-primary" onclick="deleteTopic(\'' + data[i].name + '\')">Delete</button> &nbsp; &nbsp;';
        content += '<button type="button" class="btn btn-primary" onclick="topicMessages(\'' + data[i].name + '\')">Messages</button></td>';
        content += '</tr>';
    }
    $('#topics-table tbody').html(content);
}

function updateInfo(data) {
    $('#cluster-id').html(data.clusterInfo.id);
    $('#cluster-controller').html(data.broker);
    $('#cluster-acl').html(data.clusterInfo.aclOperations);
    var content = '';
    var d = data.clusterInfo.nodes;
    for (var i = 0; i < d.length; i++) {
        content += '<tr>';
        content += '<td>' + d[i].host + '</td>';
        content += '<td>' + d[i].port + '</td>';
        content += '<td>' + d[i].id + '</td>';
        content += '</tr>';
    }
    $('#cluster-table tbody').html(content);

}

function updateConsumerGroups(data) {
    var content = '';
    // TODO: replace with JQuery to avoid possible attacks.
    for (var i = 0; i < data.length; i++) {
        content += '<tr>';
        content += '<td>' + data[i].state + '</td>';
        content += '<td>' + data[i].name + '</td>';
        content += '<td>' + data[i].coordinator + '</td>';
        content += '<td>' + data[i].protocol + '</td>';
        content += '<td>' + data[i].members + '</td>';
        content += '<td>' + data[i].lag + '</td>';
        content += '</tr>';
    }
    $('#cgropus-table tbody').html(content);
}

function errorPopUp() {
    var message = "";
    for (var i = 0; i < arguments.length; i++) {
        message += arguments[i] + " ";
    }
    alert(message);
}

function hideAllContentExcept(ex) {
    const allDivs = ["topics", "partitions", "schema", "cgroups", "acls", "nodes", "topicmsg"];
    for (let i = 0; i < allDivs.length; i++) {
        var ename = allDivs[i];
        var d = document.getElementById(ename);
        if (d !== null) {
            if (ename !== ex) {
                d.style.display = "none";
            } else {
                d.style.display = "block";
            }
        } else {
            console.error("Can not find div ", allDivs[i]);
        }
    }
}

function show(id) {
    hideAllContentExcept(id);
}

function topicMessages(topicName) {
    hideAllContentExcept("topicmsg");
    window.currentContext = {
        topicName: topicName
    };

    let partition = $("#partition-select option:selected").val();
    if (partition === 'all')
        partition = null;
    const req = {
        action: "topicMessages",
        key: topicName,
        offset: 0,
        partition: partition
    };
    doPost(req,
            function (data) {
                console.log("Topic messages OK: " + topicName);
                readMessages(data);
            },
            function (data) {
                console.error("Error  getting topic messages");
            }
    );
}

function readMessages(data) {
    var content = '';
    for (var i = 0; i < data.length; i++) {
        content += '<tr>';
        content += '<td>' + data[i].offset + '</td>';
        content += '<td>' + data[i].partition + '</td>';
        // FIXME: display as date
        content += '<td>' + data[i].timestamp + '</td>';
        content += '<td>' + data[i].key + '</td>';
        // TODO: add expanding
        content += '<td>' + data[i].value + '</td>';
        // TODO: add delete button?
        //content+='<td><button class="link" onclick="deleteMessage(\''+data[i].name+'\')">Delete</button> &nbsp; &nbsp;';
        content += '</tr>';
    }
    $('#msg-table-body').html(content);
}

function createMessage() {
    const topicName = currentContext.topicName;
    let partition = $('#partition-select option:selected').val();
    if (partition === 'any')
        partition = null;

    const rq = {
        action: "createMessage",
        topic: topicName,
        partition: partition,
        value: $('#msg-value-textarea').val(),
        key: $('#msg-key-textarea').val()
    };

    doPost(rq,
            function (data) {
                //TODO: add hot reload
            },
            function (data) {
                //failure
            }
    );

    $('#create-msg-modal').modal('hide');
    $('#msg-value-textarea').val("");
    $('#msg-key-textarea').val("");
    // TODO: make active headers tab
}

$(document).ready(function () {
    hideAllContentExcept("topics");
    getKafkaInfo();
    getTopics();

    $("#publish-msg-modal-btn").click(function () {
        const modal = new bootstrap.Modal('#create-msg-modal');
        modal.show();
        createPartitionsDropdown();
    });

    $('#send-msg-btn').click(function () {
        const modal = new bootstrap.Modal('#create-msg-modal');
        modal.hide();
        topicMessages(currentContext.topicName);
    });
});

function addHeader() {

}

function deleteHeader(id) {
    $("#" + id).remove();

}

// TODO: validate header before submitting message
function validateHeader() {

}

function createPartitionsDropdown() {
    const topicName = currentContext.topicName;

    var rq = {
        action: "getPartitions",
        topicName: topicName
    };

    doPost(rq,
            function (data) {
                let partitionObject = $('#partition-select');
                partitionObject.empty();

                partitionObject.append(
                        $("<option/>", {
                            value: "any",
                            text: "Any"
                        }).attr("selected", "selected")
                        );
                for (let partition of data) {
                    partitionObject.append(
                            $("<option/>", {
                                value: partition,
                                text: partition
                            })
                            );
                }
            },
            function (data) {
                errorPopUp("no partitions");
            }
    );
}



