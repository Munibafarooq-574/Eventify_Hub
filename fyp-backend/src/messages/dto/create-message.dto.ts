// export class CreateMessageDto {
//     readonly chatId: string;      // Chat session ID
//     readonly senderId: string;    // Sender's user ID
//     readonly receiverId: string;  // Receiver's user ID
//     readonly message: string;     // The message content
// }
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateMessageDto {
    @IsString()
    @IsNotEmpty()
    readonly chatId: string;

    @IsString()
    @IsNotEmpty()
    readonly senderId: string;

    @IsString()
    @IsNotEmpty()
    readonly receiverId: string;

    @IsString()
    @IsNotEmpty()
    readonly message: string;
}
