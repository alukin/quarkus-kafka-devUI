package org.acme.kafka.producer;

import io.quarkus.kafka.client.runtime.KafkaAdminClient;
import io.quarkus.test.junit.QuarkusTest;
import java.util.Collection;
import java.util.concurrent.ExecutionException;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.inject.Inject;
import org.apache.kafka.clients.admin.DescribeAclsOptions;
import org.apache.kafka.common.acl.AccessControlEntryFilter;
import org.apache.kafka.common.acl.AclBinding;
import org.apache.kafka.common.acl.AclBindingFilter;
import org.apache.kafka.common.resource.ResourcePatternFilter;
import org.junit.jupiter.api.Test;

@QuarkusTest
public class KafkaAclTest {

    @Inject
    KafkaAdminClient adminClient;

    @Test
    public void aclList() {

        AclBindingFilter filter = new AclBindingFilter(ResourcePatternFilter.ANY, AccessControlEntryFilter.ANY);
        Collection<AclBinding> aclBindings = null;
        try {
            aclBindings = adminClient.getAdminClient().describeAcls(filter, new DescribeAclsOptions().timeoutMs(5_000)).values().get();

            for (AclBinding ab : aclBindings) {
                System.out.println(ab.entry());
            }

        } catch (InterruptedException ex) {
            Logger.getLogger(KafkaAclTest.class.getName()).log(Level.SEVERE, null, ex);
        } catch (ExecutionException ex) {
            Logger.getLogger(KafkaAclTest.class.getName()).log(Level.SEVERE, null, ex);
        }

    }
}
