package org.acme.kafka.producer;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.json.JsonMapper;
import io.netty.handler.codec.http.HttpHeaderNames;
import io.netty.handler.codec.http.HttpResponseStatus;
import io.quarkus.kafka.client.runtime.KafkaAdminClient;
import io.quarkus.kafka.client.runtime.KafkaTopicClient;
import io.quarkus.kafka.client.runtime.KafkaWebUiUtils;
import io.quarkus.kafka.client.runtime.devconsole.model.KafkaMessageCreateRequest;
import io.quarkus.kafka.client.runtime.devconsole.model.Order;
import io.quarkus.vertx.web.ReactiveRoutes;
import io.quarkus.vertx.web.Route;
import io.vertx.ext.web.RoutingContext;
import org.jboss.logging.Logger;

import javax.inject.Inject;
import java.util.List;
import java.util.concurrent.ExecutionException;

import static io.netty.handler.codec.http.HttpResponseStatus.BAD_REQUEST;
import static io.netty.handler.codec.http.HttpResponseStatus.OK;

public class KafkaDevUiResource {
    private static final Logger LOGGER = Logger.getLogger(KafkaDevUiResource.class);
    @Inject
    KafkaAdminClient adminClient;
    @Inject
    KafkaTopicClient topicClient;
    @Inject
    KafkaWebUiUtils webUtils;

    //Sume plmumbing code to provide execution environment similar to Dev UI in extension
    @Route(methods = Route.HttpMethod.POST, path = "/kafka-admin", consumes = ReactiveRoutes.APPLICATION_JSON, produces = ReactiveRoutes.APPLICATION_JSON)
    public void handleRoute(RoutingContext event) {
        if (event.getBody() != null) {
            dispatch(event);
        }
    }

    protected void dispatch(RoutingContext event) {
        try {
            handlePost(event);
            actionSuccess(event);
        } catch (Exception e) {
            event.fail(e);
        }
    }

    protected void actionSuccess(RoutingContext event) {
        if (!event.response().ended()) {
            event.response().setStatusCode(HttpResponseStatus.SEE_OTHER.code()).headers()
                    .set(HttpHeaderNames.LOCATION, event.request().absoluteURI());
            event.response().end();
        }
    }

    //This is method that could be copy-patsted to the extension KafkaDevConsoleRecorder.java
    public void handlePost(RoutingContext event) {

        var body = event.getBodyAsJson();
        String action = body.getString("action");
        String key = body.getString("key");
        String value = body.getString("value");
        String message = "OK";

        boolean res = true;
        if (null == action) {
            res = false;
        } else {
            try {
                switch (action) {
                    case "getInfo":
                        message = webUtils.toJson(webUtils.getKafkaInfo());
                        break;
                    case "createTopic":
                        res = adminClient.createTopic(key);
                        message = webUtils.toJson(webUtils.getTopics());
                        break;
                    case "deleteTopic":
                        res = adminClient.deleteTopic(key);
                        message = webUtils.toJson(webUtils.getTopics());
                        break;
                    case "getTopics":
                        message = webUtils.toJson(webUtils.getTopics());
                        break;
                    case "topicMessages":
                        body.getInteger("");
                        message = webUtils.toJson(webUtils.getTopicMessages(key, Order.OLD_FIRST, List.of(), 0L, 10L));
                        break;
                    case "createMessage":
                        var mapper = new JsonMapper();
                        var rq = mapper.readValue(event.getBodyAsString(), KafkaMessageCreateRequest.class);
                        webUtils.createMessage(rq);
                        message = "{}";
                        break;
                    case "getPartitions":
                        var topicName = body.getString("topicName");
                        message = webUtils.toJson(webUtils.partitions(topicName));
                        break;
                    default:
                        res = false;
                        break;
                }
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
            } catch (ExecutionException ex) {
                LOGGER.error(ex);
            } catch (JsonProcessingException e) {
                throw new RuntimeException(e);
            }
        }

        if (res) {
            endResponse(event, OK, message);
        } else {
            message = "ERROR";
            endResponse(event, BAD_REQUEST, message);
        }
    }

    private void endResponse(RoutingContext event, HttpResponseStatus status, String message) {
        event.response().setStatusCode(status.code());
        event.response().end(message);
    }
}
