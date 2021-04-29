/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import {EbsDeviceVolumeType} from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import {JenkinsStack} from "./jenkins-cdk-stack";

export class JenkinsMacAgentStack extends cdk.Stack {

    constructor(scope: cdk.Construct, id: string, jenkins: JenkinsStack, props?: cdk.StackProps) {
        super(scope, id, props);

        const macdata = ec2.UserData.custom(`#!/bin/zsh
#install openjdk@8
su ec2-user -c '/usr/local/bin/brew install openjdk@8'

# Symlink openjdk@8
ln -sfn /usr/local/opt/openjdk@8/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-8.jdk
java -version

# create user and allow ssh access to the user with the same key as the ec2-user
sysadminctl -addUser jenkins 
mkdir /Users/jenkins/.ssh/
cp -a /Users/ec2-user/.ssh/. /Users/jenkins/.ssh/
cp /Users/ec2-user/.ssh/* /Users/jenkins/.ssh/.
chown -R jenkins /Users/jenkins/.ssh
chmod 700 /Users/jenkins/.ssh
chmod 600 /Users/jenkins/.ssh/authorized_keys
gem install bundler

# resize disk to match the ebs volume
PDISK=$(diskutil list physical external | head -n1 | cut -d" " -f1)
APFSCONT=$(diskutil list physical external | grep "Apple_APFS" | tr -s " " | cut -d" " -f8)
echo y | diskutil repairDisk $PDISK

diskutil apfs resizeContainer $APFSCONT 0

# Start the ARD Agent
/System/Library/CoreServices/RemoteManagement/ARDAgent.app/Contents/Resources/kickstart -activate -configure -access -on -restart -agent -privs -all
`)

        const mac = new ec2.Instance(this, 'mac-instance', {
            vpc: jenkins.vpc,
            vpcSubnets: jenkins.vpc.selectSubnets({
                subnetType: ec2.SubnetType.PRIVATE,
                availabilityZones: [this.node.tryGetContext("hostaz")],
            }),
            instanceType: new ec2.InstanceType('mac1.metal'),
            machineImage: ec2.MachineImage.genericLinux({
                'us-east-2': 'ami-003fa9ca816bcc80d',
            }),
            keyName: this.node.tryGetContext("keypair"),
            securityGroup: jenkins.jenkins_sg,
            userData: macdata,
            blockDevices: [{
                deviceName: "/dev/sda1",
                volume: ec2.BlockDeviceVolume.ebs(128, {volumeType: EbsDeviceVolumeType.GP3}),
            }]
        })

        mac.instance.hostId = this.node.tryGetContext("hostid")
        mac.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName(
            'AmazonSSMManagedInstanceCore'
        ));

        new cdk.CfnOutput(this, 'agent-private-ip', {
            value: mac.instancePrivateIp,
            description: 'Private IP Address of the mac-agent', 
            exportName: 'mac-ip', 
        });

        new cdk.CfnOutput(this, 'agent-instance-id', {
            value: mac.instanceId,
            description: 'Instance ID of the mac-agent', 
            exportName: 'mac-instance-id', 
        });
    }
}