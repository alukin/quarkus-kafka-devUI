package org.acme.kafka.producer;

import io.netty.handler.codec.http.HttpHeaderNames;
import io.netty.handler.codec.http.HttpResponseStatus;
import io.quarkus.kafka.client.runtime.KafkaAdminClient;
import io.quarkus.kafka.client.runtime.KafkaTopicClient;
import io.quarkus.kafka.client.runtime.KafkaWebUiUtils;
import io.quarkus.kafka.client.runtime.devconsole.model.Order;
import io.quarkus.vertx.web.ReactiveRoutes;
import io.quarkus.vertx.web.Route;
import io.vertx.core.MultiMap;
import io.vertx.ext.web.RoutingContext;
import org.jboss.logging.Logger;

import javax.inject.Inject;
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
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
    @Route(methods = Route.HttpMethod.POST, path = "/kafka-admin", consumes = ReactiveRoutes.APPLICATION_JSON, produces = ReactiveRoutes.APPLICATION_JSON )
    public void handleRoute(RoutingContext event) {
        if (event.getBody() != null) {
            String data = event.getBodyAsString();
            String[] parts = data.split("&");
            MultiMap post = MultiMap.caseInsensitiveMultiMap();
            for (String i : parts) {
                String[] pair = i.split("=");
                try {
                    post.add(URLDecoder.decode(pair[0], StandardCharsets.UTF_8.name()),
                            URLDecoder.decode(pair[1], StandardCharsets.UTF_8.name()));
                } catch (UnsupportedEncodingException e) {
                    throw new RuntimeException(e);
                }
            }
            dispatch(event, post);
        }
    }

    protected void dispatch(RoutingContext event, MultiMap form) {
        try {
            handlePost(event, form);
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
    public void handlePost(RoutingContext event, MultiMap form) {

        String action = form.get("action");
        String key = form.get("key");
        String value = form.get("value");
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
                        message = webUtils.toJson(webUtils.getTopicMessages(key, Order.OLD_FIRST, List.of(0), 0L, 10L));
                        break;
                    default:
                        res = false;
                        break;
                }
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
            } catch (ExecutionException ex) {
                LOGGER.error(ex);
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
