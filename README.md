oaesh
=====

Interactive command line utility to interact with the OAE REST APIs

Install
=======

`npm install -g oaesh`

Starting a Prompt
=================

`oaesh`

```
~$ oaesh
oaesh$ help
List of available commands:

use:  Set the current OAE host and protocol

oaesh$ help use

Set the current OAE host and protocol

Usage: use [(<http>|<https>)://]<hostname>[:port] [--host-header=<hostHeader>]

If the protocol is omitted from the URL, HTTPS will be assumed in full secure fashion. If oaesh was started with the --insecure flag, it will be possible to establish connections to HTTPS sites with invalid certificates. This is useful for running commands against QA and test servers that have self-signed certificates installed, but should not be used in production environments.

Examples:

    use http://localhost
    use http://localhost --host-header=cam.oae.com
    use oae.oae-qa0.oaeproject.org

Options:
  --host-header  The Host header to use in HTTP requests to the OAE tenant
```

Running as regular CLI tool
===========================

```
~$ oaesh --help
Usage: oaesh [--insecure] [--url <target>] [--username <username>] [-- <command>]

Options:
  -h, --help      Show this help dialog                                                                                                
  -i, --insecure  Allow insecure connections to the target environment, such as a QA environment that has a self-signed SSL certificate
  -U, --url       The target URL to use (e.g., https://my.oae.com)                                                                     
  -u, --username  The username to use to authenticate. If this is specified, -U must be specified as well
```

