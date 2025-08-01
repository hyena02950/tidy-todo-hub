import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

type FilterType = "all" | "active" | "completed";

const TodoList = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const { toast } = useToast();

  // Load todos from localStorage on mount
  useEffect(() => {
    const savedTodos = localStorage.getItem("todos");
    if (savedTodos) {
      const parsedTodos = JSON.parse(savedTodos).map((todo: any) => ({
        ...todo,
        createdAt: new Date(todo.createdAt)
      }));
      setTodos(parsedTodos);
    }
  }, []);

  // Save todos to localStorage whenever todos change
  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);

  const addTodo = () => {
    if (newTodo.trim()) {
      const todo: Todo = {
        id: Date.now().toString(),
        text: newTodo.trim(),
        completed: false,
        createdAt: new Date()
      };
      setTodos([todo, ...todos]);
      setNewTodo("");
      toast({
        title: "Todo added!",
        description: "Your new task has been added to the list.",
      });
    }
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(todo => 
      todo.id === id 
        ? { ...todo, completed: !todo.completed }
        : todo
    ));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
    toast({
      title: "Todo deleted",
      description: "Task has been removed from your list.",
      variant: "destructive",
    });
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === "active") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });

  const activeCount = todos.filter(todo => !todo.completed).length;
  const completedCount = todos.filter(todo => todo.completed).length;

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Tidy Todo Hub
        </h1>
        <p className="text-muted-foreground">
          Stay organized and get things done
        </p>
      </div>

      {/* Add Todo */}
      <Card className="p-6 shadow-lg border-0 bg-gradient-to-r from-card to-secondary/50">
        <div className="flex gap-3">
          <Input
            placeholder="What needs to be done?"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addTodo()}
            className="flex-1 border-primary/20 focus:border-primary"
          />
          <Button 
            onClick={addTodo}
            variant="gradient"
            className="shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="flex justify-center gap-6 text-sm text-muted-foreground">
        <span>{activeCount} active</span>
        <span>{completedCount} completed</span>
        <span>{todos.length} total</span>
      </div>

      {/* Filters */}
      <div className="flex justify-center gap-2">
        {(["all", "active", "completed"] as FilterType[]).map((filterType) => (
          <Button
            key={filterType}
            variant={filter === filterType ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(filterType)}
            className="capitalize"
          >
            <Filter className="w-3 h-3 mr-1" />
            {filterType}
          </Button>
        ))}
      </div>

      {/* Todo List */}
      <div className="space-y-3">
        {filteredTodos.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <p className="text-muted-foreground">
              {filter === "all" ? "No todos yet. Add one above!" : 
               filter === "active" ? "No active todos!" : 
               "No completed todos yet!"}
            </p>
          </Card>
        ) : (
          filteredTodos.map((todo) => (
            <Card 
              key={todo.id} 
              className={`p-4 transition-all duration-300 hover:shadow-md border-l-4 ${
                todo.completed 
                  ? "border-l-success bg-success/5" 
                  : "border-l-primary bg-card"
              }`}
            >
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={() => toggleTodo(todo.id)}
                  className="data-[state=checked]:bg-success border-primary"
                />
                <span 
                  className={`flex-1 ${
                    todo.completed 
                      ? "line-through text-muted-foreground" 
                      : "text-foreground"
                  }`}
                >
                  {todo.text}
                </span>
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {todo.createdAt.toLocaleDateString()}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteTodo(todo.id)}
                  className="hover:bg-destructive/10 hover:text-destructive shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Clear completed */}
      {completedCount > 0 && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => {
              setTodos(todos.filter(todo => !todo.completed));
              toast({
                title: "Completed todos cleared",
                description: `Removed ${completedCount} completed tasks.`,
              });
            }}
            className="text-muted-foreground hover:text-destructive"
          >
            Clear completed ({completedCount})
          </Button>
        </div>
      )}
    </div>
  );
};

export default TodoList;