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

#include <iostream>

#include <Board.h>

using std::cout;

int main() {
    Board myBoard(15, 15);
    myBoard.setSnake(13, 7, Up);

    myBoard.setFood(1, 7);

    myBoard.moveSnake(Up);
    system("clear");

    while(1) {
        std::cout << myBoard.moveSnake() << '\n';
        myBoard.print();
        sleep(1);
        system("clear");
    }

    return 0;
}
