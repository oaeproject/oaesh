module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-release');

    grunt.initConfig({
        'release': {
            'options': {
                'github': {
                    'repo': 'mrvisser/oaesh',
                    'usernameVar': 'GITHUB_USERNAME',
                    'passwordVar': 'GITHUB_PASSWORD'
                }
            }
        }
    });
};
