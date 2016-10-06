//
//  Copyright © 2016 Project Llama. All rights reserved.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
//

#include <unistd.h>
#include <sys/ioctl.h>
#include <sys/select.h>
#include <termios.h>

#ifdef __MACH__
// macOS
#include <sys/filio.h>
#else
// Linux
#include <asm-generic/ioctls.h>
#endif

#include <chrono>
#include <iostream>
#include <thread>

#include "Board.h"

using std::cout;

Board myBoard(15, 15);
constexpr uint32_t step_time = 200;
uint8_t currentInput = Up;

void terminal(bool in_game) {
    static struct termios old = {0};
    struct termios game = {0};
    if (in_game) {
        if (tcgetattr(0, &old) < 0 || tcgetattr(0, &game) < 0) {
            perror("tcsetattr()");
        }
        
        game.c_lflag &= ~ICANON;
        game.c_lflag &= ~ECHO;
        game.c_lflag &= ~IEXTEN;
        game.c_cc[VMIN] = 1;
        game.c_cc[VTIME] = 0;
        if (tcsetattr(0, TCSANOW, &game) < 0) {
            perror("tcsetattr ICANON");
        }
    } else {
        if (tcsetattr(0, TCSANOW, &old) < 0) {
            perror("tcsetattr ICANON");
        }
    }
}

void setup() {
    myBoard.setSnake(13, 7, Up);
    myBoard.setFood(1, 7);
    system("clear");
    myBoard.print();
    terminal(true);
}

void gameover() {
    terminal(false);
    exit(0);
}

void board_move_snake() {
    static auto last = std::chrono::high_resolution_clock::now();
    auto current = std::chrono::high_resolution_clock::now();
    
    fprintf(stderr, "%f\n", ((std::chrono::duration<double>)((current - last))).count());
    if (((std::chrono::duration<double>)((current - last))).count() * 1000 > step_time) {
        switch (myBoard.moveSnake(currentInput)) {
            case -1:
                gameover();
                break;
            case 0:
                myBoard.appendSnake();
                myBoard.setFood();
                break;
            default:
                break;
        }
        last = std::chrono::high_resolution_clock::now();
    }
}

int main() {
    setup();
    fd_set terminal_fd;
    FD_ZERO(&terminal_fd);
    FD_SET(STDIN_FILENO, &terminal_fd);
    if (!FD_ISSET(STDIN_FILENO, &terminal_fd)) {
        perror("Cannot select stdin");
        exit(-1);
    }
    while (1) {
        // timeout for select
        struct timeval timeout;
        timeout.tv_sec = 0;
        timeout.tv_usec = step_time * 1000;
        
        // capture terminal_fd
        fd_set terminal_read = terminal_fd;
        
        // wait for reading
        int terminal_ret = select(FD_SETSIZE, &terminal_read, NULL, NULL, &timeout);
        
        // timeout
        if (terminal_ret == 0) {
        } else if (terminal_ret == -1) { // error
            perror("[ERROR] select:");
        } else { // read available
            // read
            if (FD_ISSET(0, &terminal_read)) {
                // bytes
                int count;
                
                // read through ioctl
                ioctl(0, FIONREAD, &count);
                
                // there are some characters available to read
                if (count == 1) {
                    unsigned char input = '\0';
                    
                    // read from stdin
                    count = (int)read(STDIN_FILENO, &input, count);
                    if (count == 1) {
                        switch (input) {
                            case 'w':
                                if (currentInput != Down) currentInput = Up;
                                break;
                            case 's':
                                if (currentInput != Up) currentInput = Down;
                                break;
                            case 'a':
                                if (currentInput != Right) currentInput = Left;
                                break;
                            case 'd':
                                if (currentInput != Left) currentInput = Right;
                                break;
                            default:
                                break;
                        }
                    }
                }
            }
        }
        board_move_snake();
        system("clear");
        myBoard.print();
    }
    return 0;
}
