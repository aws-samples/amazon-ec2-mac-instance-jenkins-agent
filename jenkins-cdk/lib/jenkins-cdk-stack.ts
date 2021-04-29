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
import {AmazonLinuxEdition, AmazonLinuxGeneration} from '@aws-cdk/aws-ec2';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as autoscaling from '@aws-cdk/aws-autoscaling';
import {EbsDeviceVolumeType} from '@aws-cdk/aws-autoscaling';
import * as iam from '@aws-cdk/aws-iam';

export class JenkinsStack extends cdk.Stack {
    readonly vpc: ec2.Vpc;
    readonly jenkins_sg: ec2.SecurityGroup;

    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this.vpc = new ec2.Vpc(this, 'mac-vpc', {
            cidr: "10.0.0.0/16",
            maxAzs: 99,
        });

        this.jenkins_sg = new ec2.SecurityGroup(this, 'jenkins-sg', {
            securityGroupName: "jenkins-sg",
            vpc: this.vpc,
        })

        const lb = new elbv2.ApplicationLoadBalancer(this, 'alb-jenkins', {
            vpc: this.vpc,
            internetFacing: true
        });


        const listener = lb.addListener('alb-http-listener', {
            port: 80,
            open: true,
        });

        const userdata = ec2.UserData.forLinux()
        userdata.addCommands(`
yum update –y
wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo
rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io.key
yum upgrade
yum install jenkins java-1.8.0-openjdk-devel git -y
systemctl daemon-reload
systemctl start jenkins
systemctl status jenkins
    `)

        this.jenkins_sg.addIngressRule(this.jenkins_sg, ec2.Port.tcp(22), 'Allow ssh access from the Jenkins systems');

        const asg = new autoscaling.AutoScalingGroup(this, 'jenkins-asg', {
            vpc: this.vpc,
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MEDIUM),
            machineImage: new ec2.AmazonLinuxImage({
                edition: AmazonLinuxEdition.STANDARD,
                generation: AmazonLinuxGeneration.AMAZON_LINUX_2
            }),
            maxCapacity: 1,
            minCapacity: 1,
            desiredCapacity: 1,
            userData: userdata,
            securityGroup: this.jenkins_sg,
            blockDevices: [{
                deviceName: "/dev/xvda",
                volume: autoscaling.BlockDeviceVolume.ebs(32, {volumeType: EbsDeviceVolumeType.GP2}),
            }]
        });
        asg.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'))

        listener.addTargets('jenkins-fleet', {
            port: 8080,
            targets: [asg],
            healthCheck: {
                path: '/login'
            }
        });

        new cdk.CfnOutput(this, 'asg-url', {
            value: lb.loadBalancerDnsName,
            description: 'Loadbalancer url', // Optional
            exportName: 'lb-url', // Registers a CloudFormation export named "TheAwesomeBucket"
        });
    }
}