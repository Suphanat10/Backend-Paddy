pipeline {
    agent any

    triggers {
        pollSCM('H/2 * * * *')
    }

    environment {
        BUILD_TAG = "${env.BUILD_NUMBER}"
    }

    parameters {
        booleanParam(
            name: 'CLEAN_VOLUMES',
            defaultValue: true,
            description: 'Remove volumes (clears database)'
        )
        string(
            name: 'PUBLIC_IP',
            defaultValue: '54.206.19.89',
            description: 'Public IP or domain of the server'
        )
    }

    stages {
        stage('Checkout') {
            steps {
                script {
                    echo "Checking out code..."
                    checkout scm
                    env.GIT_COMMIT_SHORT = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
                    echo "Build: ${BUILD_TAG}, Commit: ${env.GIT_COMMIT_SHORT}"
                }
            }
        }

        stage('Validate') {
            steps {
                script {
                    echo "Validating Docker Compose configuration..."
                    sh 'docker compose config'
                }
            }
        }

        stage('Prepare Environment') {
            steps {
                script {
                    echo "Preparing backend environment (.env)..."

                    withCredentials([
                        string(credentialsId: 'MYSQL_ROOT_PASSWORD', variable: 'MYSQL_ROOT_PASS'),
                        string(credentialsId: 'MYSQL_PASSWORD',      variable: 'MYSQL_PASS')
                    ]) {
                        writeFile file: '.env', text: """\
MYSQL_ROOT_PASSWORD=${env.MYSQL_ROOT_PASS}
MYSQL_DATABASE=tutorial
MYSQL_USER=root
MYSQL_PASSWORD=${env.MYSQL_PASS}
MYSQL_PORT=3306
NODE_ENV=production
API_PORT=8000
HOST=0.0.0.0
""".stripIndent()

                        echo ".env file created"
                    }
                }
            }
        }

        stage('Deploy Backend') {
            steps {
                script {
                    echo "Deploying backend services using Docker Compose..."

                    def downCommand = 'docker compose down'
                    if (params.CLEAN_VOLUMES) {
                        echo "WARNING: Removing volumes (database will be cleared)"
                        downCommand = 'docker compose down -v'
                    }
                    sh downCommand

                    sh """
                        docker compose build --no-cache
                        docker compose up -d
                    """
                }
            }
        }

        stage('Health Check') {
            steps {
                script {
                    echo "Waiting for services to start..."
                    sh 'sleep 15'

                    sh """
                        docker compose ps

                        timeout 60 bash -c 'until curl -f http://localhost:8001; do sleep 2; done' || exit 1

                        echo "Health check passed"
                    """
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                script {
                    sh """
                        echo "=== Container Status ==="
                        docker compose ps

                        echo ""
                        echo "=== Service Logs (last 20 lines) ==="
                        docker compose logs --tail=20

                        echo ""
                        echo "=== Public Access ==="
                        echo "API: http://${params.PUBLIC_IP}:8001"
                        echo "phpMyAdmin: http://${params.PUBLIC_IP}:8081"
                    """
                }
            }
        }
    }

    post {
        success {
            echo "✅ Backend deployment successful"
            echo "Build: ${BUILD_TAG}"
            echo "Commit: ${env.GIT_COMMIT_SHORT}"
            echo "API: http://${params.PUBLIC_IP}:8001"
            echo "phpMyAdmin: http://${params.PUBLIC_IP}:8081"
        }
        failure {
            echo "❌ Deployment failed"
            sh 'docker compose logs --tail=50 || true'
        }
        always {
            echo "Cleaning unused Docker resources..."
            sh 'docker image prune -f'
        }
    }
}
