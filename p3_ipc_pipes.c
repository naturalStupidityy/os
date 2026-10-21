/* Assignment 3: IPC using pipes and redirection
 * Includes: parent to multiple children, output redirection, pipe chain
 */
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/wait.h>
#include <string.h>
#include <fcntl.h>

#define MAX_CHILDREN 10
#define BUF_SIZE     256

/* Parent sends one message to N children, each via its own pipe */
static void parent_to_children(void) {
    int n;
    printf("Enter number of children (1-%d): ", MAX_CHILDREN);
    if (scanf("%d", &n) != 1 || n < 1 || n > MAX_CHILDREN) {
        printf("Invalid\n"); return;
    }
    getchar(); /* consume newline */

    char msg[BUF_SIZE];
    printf("Enter message to send: ");
    if (!fgets(msg, BUF_SIZE, stdin)) return;
    msg[strcspn(msg, "\n")] = 0;

    int pipes[MAX_CHILDREN][2];
    for (int i = 0; i < n; i++)
        if (pipe(pipes[i]) < 0) { perror("pipe"); exit(1); }

    for (int i = 0; i < n; i++) {
        pid_t pid = fork();
        if (pid < 0) { perror("fork"); exit(1); }
        if (pid == 0) {
            /* child i: read from pipes[i][0], close everything else */
            for (int j = 0; j < n; j++) {
                if (j != i) close(pipes[j][0]);
                close(pipes[j][1]);
            }
            char buf[BUF_SIZE];
            int bytes = read(pipes[i][0], buf, BUF_SIZE - 1);
            if (bytes > 0) {
                buf[bytes] = 0;
                printf("Child %d (PID %d) received: %s\n",
                       i + 1, getpid(), buf);
            }
            close(pipes[i][0]);
            exit(0);
        }
        /* parent: keep write end, close read end */
        close(pipes[i][0]);
    }

    for (int i = 0; i < n; i++) {
        write(pipes[i][1], msg, strlen(msg));
        close(pipes[i][1]);
    }
    for (int i = 0; i < n; i++) wait(NULL);
    printf("Parent (PID %d): all children done\n", getpid());
}

/* Demonstrate output redirection: ls -l > output.txt */
static void redirection_demo(void) {
    printf("Running: ls -l > output.txt\n");
    pid_t pid = fork();
    if (pid < 0) { perror("fork"); return; }
    if (pid == 0) {
        int fd = open("output.txt", O_WRONLY | O_CREAT | O_TRUNC, 0644);
        if (fd < 0) { perror("open"); exit(1); }
        dup2(fd, STDOUT_FILENO);
        close(fd);
        execlp("ls", "ls", "-l", NULL);
        perror("execlp");
        exit(1);
    }
    wait(NULL);
    printf("Parent: output written to output.txt\n");
}

/* Demonstrate a pipe chain: ls | wc -l */
static void pipe_chain(void) {
    printf("Running: ls | wc -l\n");
    int p[2];
    if (pipe(p) < 0) { perror("pipe"); return; }

    pid_t p1 = fork();
    if (p1 == 0) {
        dup2(p[1], STDOUT_FILENO);
        close(p[0]); close(p[1]);
        execlp("ls", "ls", NULL);
        exit(1);
    }
    pid_t p2 = fork();
    if (p2 == 0) {
        dup2(p[0], STDIN_FILENO);
        close(p[0]); close(p[1]);
        execlp("wc", "wc", "-l", NULL);
        exit(1);
    }
    close(p[0]); close(p[1]);
    waitpid(p1, NULL, 0);
    waitpid(p2, NULL, 0);
    printf("Parent: pipe chain done\n");
}

int main(void) {
    int choice;
    while (1) {
        printf("\n--- IPC Demo ---\n");
        printf("1. Parent to multiple children (pipes)\n");
        printf("2. Output redirection (ls > file)\n");
        printf("3. Pipe chain (ls | wc -l)\n");
        printf("4. Exit\n");
        printf("Choice: ");
        if (scanf("%d", &choice) != 1) break;
        switch (choice) {
            case 1: parent_to_children(); break;
            case 2: redirection_demo();  break;
            case 3: pipe_chain();         break;
            case 4: exit(0);
            default: printf("Invalid choice\n");
        }
    }
    return 0;
}
