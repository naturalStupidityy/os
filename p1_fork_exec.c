/* Assignment 1: Simulate Linux commands using fork() and exec()
 * Demonstrates: cp, grep, ls - also shows wait(), getpid(), exit()
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/wait.h>
#include <unistd.h>

void do_cp(void) {
  char src[256], dst[256];
  printf("Enter source file: ");
  scanf("%255s", src);
  printf("Enter destination file: ");
  scanf("%255s", dst);

  pid_t pid = fork();
  if (pid < 0) {
    perror("fork");
    return;
  }
  if (pid == 0) {
    printf("Child PID %d: copying %s -> %s\n", getpid(), src, dst);
    execlp("cp", "cp", src, dst, NULL);
    perror("execlp cp");
    exit(1);
  }
  wait(NULL);
  printf("Parent PID %d: cp completed\n", getpid());
}

void do_grep(void) {
  char pattern[256], file[256];
  printf("Enter pattern: ");
  scanf("%255s", pattern);
  printf("Enter file: ");
  scanf("%255s", file);

  pid_t pid = fork();
  if (pid < 0) {
    perror("fork");
    return;
  }
  if (pid == 0) {
    printf("Child PID %d: grep '%s' in %s\n", getpid(), pattern, file);
    execlp("grep", "grep", "--color=never", pattern, file, NULL);
    perror("execlp grep");
    exit(1);
  }
  wait(NULL);
  printf("Parent PID %d: grep completed\n", getpid());
}

void do_ls(void) {
  pid_t pid = fork();
  if (pid < 0) {
    perror("fork");
    return;
  }
  if (pid == 0) {
    printf("Child PID %d: running ls -l\n", getpid());
    execlp("ls", "ls", "-l", NULL);
    perror("execlp ls");
    exit(1);
  }
  wait(NULL);
  printf("Parent PID %d: ls completed\n", getpid());
}

void do_exit_demo(void) {
  pid_t pid = fork();
  if (pid < 0) {
    perror("fork");
    return;
  }
  if (pid == 0) {
    printf("Child PID %d: doing work, then exit(42)\n", getpid());
    exit(42);
  }
  int status;
  wait(&status);
  if (WIFEXITED(status))
    printf("Parent: child exited with status %d\n", WEXITSTATUS(status));
}

int main(void) {
  int choice;
  while (1) {
    printf("\n--- fork()/exec() Demo ---\n");
    printf("1. Simulate cp\n");
    printf("2. Simulate grep\n");
    printf("3. Simulate ls -l\n");
    printf("4. Demo exit() status\n");
    printf("5. Exit\n");
    printf("Choice: ");
    if (scanf("%d", &choice) != 1)
      break;
    switch (choice) {
    case 1:
      do_cp();
      break;
    case 2:
      do_grep();
      break;
    case 3:
      do_ls();
      break;
    case 4:
      do_exit_demo();
      break;
    case 5:
      exit(0);
    default:
      printf("Invalid choice\n");
    }
  }
  return 0;
}
