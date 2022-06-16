package org.acme.kafka.producer;

import io.quarkus.kafka.client.runtime.KafkaAdminClient;
import javax.inject.Inject;


public class KafkaDevUiResource {
    @Inject
    KafkaAdminClient kafkaAfminClien;
}
