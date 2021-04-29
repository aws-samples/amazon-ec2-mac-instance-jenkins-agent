fastlane documentation
================
# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```
xcode-select --install
```

Install _fastlane_ using
```
[sudo] gem install fastlane -NV
```
or alternatively using `brew install fastlane`

# Available Actions
## iOS
### ios dependencies
```
fastlane ios dependencies
```

### ios test
```
fastlane ios test
```
This lane executes the tests of the project using fastlane scan
### ios build
```
fastlane ios build
```
This lane describes the build phase
### ios deploy_to_testflight
```
fastlane ios deploy_to_testflight
```
This lane sync the code signing tot he local machine, Builds the application and uploads it to testflight

----

This README.md is auto-generated and will be re-generated every time [fastlane](https://fastlane.tools) is run.
More information about fastlane can be found on [fastlane.tools](https://fastlane.tools).
The documentation of fastlane can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
