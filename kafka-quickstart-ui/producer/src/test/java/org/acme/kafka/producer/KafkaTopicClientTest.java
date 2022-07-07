package org.acme.kafka.producer;

import io.quarkus.kafka.client.runtime.KafkaTopicClient;
import io.quarkus.kafka.client.runtime.devui.model.KafkaMessage;
import io.quarkus.kafka.client.runtime.devui.model.KafkaMessagePage;
import io.quarkus.kafka.client.runtime.devui.model.Order;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.common.ResourceArg;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.kafka.InjectKafkaCompanion;
import io.quarkus.test.kafka.KafkaCompanionResource;
import io.smallrye.reactive.messaging.kafka.companion.KafkaCompanion;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.utils.Bytes;
import org.jetbrains.annotations.NotNull;
import org.junit.Before;
import org.junit.jupiter.api.Test;

import javax.inject.Inject;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * These tests are fluky, as it seems, that Kafka Companion sometimes does not write all the values to Kafka, but skips some of them.
 */
@QuarkusTest
@QuarkusTestResource(value = KafkaCompanionResource.class, initArgs = {@ResourceArg(name = "num.partitions", value = "3")})
public class KafkaTopicClientTest {
    private static final String DEFAULT_TOPIC = "test-topic";
    private static final int DEFAULT_PAGE_SIZE = 10;
    private static final Map<Integer, Long> FIRST_PAGE_PARTITION_OFFSET = Map.of(0, 0L, 1, 0L, 2, 0L);
    @InjectKafkaCompanion
    KafkaCompanion companion;
    @Inject
    KafkaTopicClient client;

    // Kafka companion does not guarantee clean up after each test, so forcing it manually.
    @Before
    public void cleanUp() {
        companion.deleteRecords(new TopicPartition(DEFAULT_TOPIC, 0), 100L);
        companion.deleteRecords(new TopicPartition(DEFAULT_TOPIC, 1), 100L);
        companion.deleteRecords(new TopicPartition(DEFAULT_TOPIC, 2), 100L);
    }

    @Test
    void returnsManyPagesOfMessagesOfAllPartitionsOrderedOldest() throws ExecutionException, InterruptedException {
        var msgCount = 25;
        companion.produceStrings()
                .usingGenerator(i -> new ProducerRecord<>(DEFAULT_TOPIC, i.toString()), msgCount)
                .awaitCompletion();
        var order = Order.OLD_FIRST;

        var currentPage = 0;
        var expectedMessages = getExpectedResponse(msgCount, currentPage, order);
        var nextPartitionOffset = assertPage(order, FIRST_PAGE_PARTITION_OFFSET, expectedMessages);

        currentPage++;
        expectedMessages = getExpectedResponse(msgCount, currentPage, order);
        nextPartitionOffset = assertPage(order, nextPartitionOffset, expectedMessages);

        currentPage++;
        expectedMessages = getExpectedResponse(msgCount, currentPage, order);
        assertPage(order, nextPartitionOffset, expectedMessages);
    }

    @Test
    void returnsManyPagesOfMessagesOfAllPartitionsOrderedNewest() throws ExecutionException, InterruptedException {
        var msgCount = 25;
        companion.produceStrings().usingGenerator(i -> new ProducerRecord<>(DEFAULT_TOPIC, i.toString()), msgCount).awaitCompletion();

        var currentPage = 0;
        var order = Order.NEW_FIRST;
        var partitionOffset = client.getPagePartitionOffset(DEFAULT_TOPIC, List.of(0, 1, 2), order);
        var expectedMessages = getExpectedResponse(msgCount, currentPage, order);
        var nextPartitionOffset = assertPage(order, partitionOffset, expectedMessages);

        currentPage++;
        expectedMessages = getExpectedResponse(msgCount, currentPage, order);
        nextPartitionOffset = assertPage(order, nextPartitionOffset, expectedMessages);

        currentPage++;
        expectedMessages = getExpectedResponse(msgCount, currentPage, order);
        assertPage(order, nextPartitionOffset, expectedMessages);
    }

    private Map<Integer, Long> assertPage(Order order, Map<Integer, Long> partitionOffset, List<String> expectedMessages) throws ExecutionException, InterruptedException {
        var page = getMassageValues(order, partitionOffset);
        var pageMessages = page.getLeft();
        assertThat(pageMessages).containsAll(expectedMessages);
        return page.getRight();
    }

    @NotNull
    private List<String> getExpectedResponse(int totalMsgCount, int pageNumber, Order order) {
        var first = Math.min(pageNumber * DEFAULT_PAGE_SIZE, totalMsgCount);
        var last = Math.min(totalMsgCount - 1, first + DEFAULT_PAGE_SIZE - 1);

        if (Order.NEW_FIRST == order) {
            first = totalMsgCount - first - 1;
            last = totalMsgCount - last - 1;
        }
        if(last < first){
            var tmp = last;
            last = first;
            first = tmp;
        }

        Comparator<Integer> comparator = Order.NEW_FIRST == order?
                Comparator.reverseOrder() :
                Comparator.naturalOrder();

        return IntStream.rangeClosed(first, last).boxed()
                .sorted(comparator)
                .map(Object::toString)
                .collect(Collectors.toList());
    }

    @NotNull
    private Pair<List<String>, Map<Integer, Long>> getMassageValues(Order order, Map<Integer, Long> partitionOffset) throws ExecutionException, InterruptedException {
        KafkaMessagePage topicMessages = client.getTopicMessages(DEFAULT_TOPIC, order, partitionOffset, DEFAULT_PAGE_SIZE);
        return Pair.of(topicMessages.getMessages().stream().map(KafkaMessage::getValue).collect(Collectors.toList()), topicMessages.getPartitionOffset());
    }

    @Test
    void returnsMessagesOfSinglePartition() throws ExecutionException, InterruptedException {
        int msgCount = 30;
        companion.produceStrings()
                // Using round Robin for message to partition assignment, so partition 0 will contain messages 0, 3, 6, 9...
                .usingGenerator(i -> new ProducerRecord<>(DEFAULT_TOPIC, i % 3, i.toString(), i.toString()), msgCount).awaitCompletion();

        var expectedMessages = IntStream.range(0, msgCount)
                .boxed().filter(x -> x % 3 == 0)
                .map(Object::toString)
                .collect(Collectors.toList());

        assertPage(Order.OLD_FIRST, Map.of(0, 0L), expectedMessages);
    }

    @Test
    void returnsMessagesOfMultipleButNotAllPartitions() throws ExecutionException, InterruptedException {
        int msgCount = 30;
        companion.produceStrings()
                // Using round Robin for message to partition assignment, so partition 0 will contain messages 0, 3, 6, 9...
                .usingGenerator(i -> new ProducerRecord<>(DEFAULT_TOPIC, i % 3, i.toString(), i.toString()), msgCount)
                .awaitCompletion();

        var expectedMessages = IntStream.range(0, msgCount)
                .boxed()
                .filter(x -> x % 3 == 0 || x % 3 == 1)
                .map(Object::toString)
                .limit(10)
                .collect(Collectors.toList());

        assertPage(Order.OLD_FIRST, Map.of(0, 0L, 1, 0L), expectedMessages);
    }

    @Test
    void zeroPageSizeIsInvalid() {
        assertThatThrownBy(() -> client.getTopicMessages(DEFAULT_TOPIC, Order.OLD_FIRST, FIRST_PAGE_PARTITION_OFFSET, 0)).isInstanceOf(IllegalArgumentException.class).hasMessage("Page size must be > 0.");
    }

    @Test
    void negativePageSizeIsInvalid() {
        assertThatThrownBy(() -> client.getTopicMessages(DEFAULT_TOPIC, Order.OLD_FIRST, FIRST_PAGE_PARTITION_OFFSET, -10)).isInstanceOf(IllegalArgumentException.class).hasMessage("Page size must be > 0.");
    }

    @Test
    void negativeOffsetIsInvalid() {
        assertThatThrownBy(() ->
                client.getTopicMessages(DEFAULT_TOPIC, Order.OLD_FIRST, Map.of(0, -10L), DEFAULT_PAGE_SIZE))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("Partition offset must be > 0.");
    }

    @Test
    void emptyPartitionOffsetMapThrows() {
        assertThatThrownBy(() -> client.getTopicMessages(DEFAULT_TOPIC, Order.OLD_FIRST, Map.of(), DEFAULT_PAGE_SIZE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Offset map is not defined.");
    }

}
