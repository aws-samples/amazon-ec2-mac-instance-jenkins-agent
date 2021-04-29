 # iOS mobile app CI/CD pipeline with Amazon EC2 Mac Instances 

[TBA Link to Blogpost]()

In this repository you find two [CDK](https://aws.amazon.com/cdk/) stacks and an Hello World demo application to build with an Amazon EC2 Mac Instance as Jenkins agent.

1. **JenkinsStack** - Deploys an Amazon VPC with an Amazon EC2 instance with an Jenkins installed. It also adds an [Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html) in front of the Jenkins.
2. **JenkinsMacAgentStack** - Deploys an Amazon EC2 Mac Instance on a dedicated Amazon EC2 Mac Instance host and installs the dependencies to use it as a Jenkins agent

All instances will be set up so that you are required to use [AWS Systems Manager Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html) to connect to the instance. Please note that you are the `ssm-user` when using the SSM Session Manager. If you want to run brew commands you've to start with `su -u ec2-user '/usr/local/bin/brew install <>'`

## Disclaimer

This project is an example of an deployment and meant to be used for testing and learning purposes only. Do not use it in production.

Be aware that the deployment isn't covered by the AWS free tier. Please use the AWS pricing calculator to an estimation beforehand.
Please consider that a Dedicated Host for Amazon EC2 Mac Instaces has a minimum allocation period of 24h before you can release it. For more information, see [Amazon EC2 Mac Instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-mac-instances.html).

## Deployment

To deploy the Stacks navigate to the `jenkins-cdk` folder first.

### Deployment of Jenkins

```
cdk deploy JenkinsStack
```

The Stack will output the ALB's url to connect to the Jenkins instance.

To get the password for Jenkins, connect to Jenkins using SSM Session Manager and `sudo cat /var/lib/jenkins/secrets/initialAdminPassword`

### Deployment of the Amazon E2 Mac Instance as Jenkins Agent 

Before you can deploy the second stack you've to create a dedicated host for the Amazon EC2 Mac Instance. **Please Consider that a Dedicated Host for Amazon EC2 Mac Instaces has a minimum allocation period of 24h before you can release it.**

Follow the instructions of the [Amazon EC2 Mac Instance documentation](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-mac-instances.html#mac-instance-launch) to allocate a dedicated host. The dedicated `host-id` and `host-az` will then be used to deploy the `JenkinsMacAgentStack`. This stack will run an Amazon EC2 Mac Instance on the dedicated host for the Jenkins agent.

This stack currently only has a AMI Map for `us-east-2`. If you want to deploy this stack in a different region, please adjust:

```ts
machineImage: ec2.MachineImage.genericLinux({
    'us-east-2': 'ami-003fa9ca816bcc80d',
}),
```

of the `jenkins-agent-stack.ts` to reflect your region and desired AMI.

Before you deploy please create a ec2-key pair in the region you deploy the agent to. This key pair will be used by the Jenkins to connect to the agent.

To deploy the agent:

```
cdk deploy JenkinsMacAgentStack --context hostid=<dedicated-host-id> --context hostaz=<dedicated-host-az> --context keypair=<key-pair-name>
```

Outputs:

- Agent Instance ID
- Agent instance private IP to set up the agent from the Jenkins head

## Configuration of the Agent

Please follow the steps of the Blogpost [TBA Unify your mobile app CI/CD pipeline on EC2]() for the configuration of the Jenkins agent and the Amazon EC2 Mac Instance for building mobile applications and to build the demo `HelloWorld` demo application.

You can use the Systems Manager Session Manager to establish an ssh tunel so you can use the VNC of the Amazon EC2 Mac instance:

```
aws ssm start-session --target <mac instance id> --region us-east-2 --document-name AWS-StartPortForwardingSession --parameters '{"portNumber":["5900"], "localPortNumber":["5900"]}'
```

After this open a second terminal window and run:

```
open vnc://localhost:5900
```

Be sure that you set a password on the agent before by using the AWS Systems Manager Session Manager. 

```
sudo passwd ec2-user
```

If you want to change the screens resolution be sure to follow the guide [Modify macOS screen resolution on Mac instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-mac-instances.html#mac-screen-resolution) of the documentation.

## Clean Up

Destroy the two created stacks:

```
cdk destroy JenkinsMacAgentStack
cdk destroy JenkinsStack
```

Follow the instructions to release the dedicated host, [Release the Dedicated Host for your Mac instance](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-mac-instances.html#mac-instance-release-dedicated-host). 

## Debugging failing builds

Do debug build issues it's a good first step to SSH to the Amazon EC2 Mac Instance and using the Terminal executing the same commands as the Jenkins would run. This may give further insights.

- SSH to the Amazon EC2 Mac Instance
- Clone your project the repository or this Repository
- run `fastlane exec xyz`

--- 

If you see:

> Unable to locate Xcode. Please make sure to have Xcode installed on your machine

- Open Xcode
- Navigate to Fiels and Preferences 
- Navigate to Locations -> Command Line Tools
- [OPTIONAL] `sudo xcode-select -switch /Applications/Xcode.app/Contents/Developer`

--- 

If you see this while fastlane creation 

```
xcodebuild: error: The project named "HelloWorld" does not contain a scheme named "HelloWorld". The "-list" option can be used to find the names of the schemes in the projec
```

- Go to your xcode select Product > Schemes > Manage Schemes and close it again. Make sure that the `xcscheme`file has been created in your project at
`WorkspaceName.xcworkspace/xcshareddata/xcschemes`.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the [LICENSE](LICENSE) file.

